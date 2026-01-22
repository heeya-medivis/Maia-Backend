import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { env } from "../config/env.js";
import { db } from "../db/index.js";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
import { users, devices, orgMembers, organizations, deviceHandoffCodes } from "../db/schema/index.js";
import { eq, and, isNull } from "drizzle-orm";
import {
  createHandoffCode,
  validateAndConsumeHandoffCode,
  cleanupDeviceHandoffCodes,
} from "../services/auth/handoff.js";
import {
  createSession,
  refreshSession,
  revokeSession,
} from "../services/auth/session.js";
import { getEntitlements } from "../services/entitlements/index.js";
import { getBalance } from "../services/credits/ledger.js";
import { ensurePersonalOrg } from "../services/org/personal-org.js";
import { authMiddleware } from "../middleware/auth.js";
import { DEVICE_ID_HEADER } from "../middleware/device.js";
import { BadRequestError, UnauthorizedError } from "../middleware/error.js";

const auth = new Hono();

// Schema for handoff initiation (Unity calls this first)
const initiateSchema = z.object({
  deviceId: z.string().min(8).max(64),
  deviceInfo: z
    .object({
      name: z.string().optional(),
      deviceType: z.enum(["desktop", "xr", "mobile", "web"]).optional(),
      platform: z
        .enum(["windows", "macos", "linux", "ios", "android", "quest", "visionpro", "web"])
        .optional(),
      appVersion: z.string().optional(),
      osVersion: z.string().optional(),
    })
    .optional(),
});

// POST /auth/handoff/initiate - Unity calls this to start auth flow
auth.post("/handoff/initiate", zValidator("json", initiateSchema), async (c) => {
  const { deviceId } = c.req.valid("json");

  // Clean up any existing unused handoff codes for this device
  await cleanupDeviceHandoffCodes(deviceId);

  // Generate the auth URL - this page will handle Clerk auth
  const authUrl = `${env.APP_URL}/auth/login?device_id=${encodeURIComponent(deviceId)}`;

  return c.json({
    success: true,
    authUrl,
    deviceId,
    message: "Open authUrl in browser to authenticate",
  });
});

// GET /auth/handoff/poll - Unity polls this to check if auth is complete
auth.get("/handoff/poll", async (c) => {
  const deviceId = c.req.query("device_id");

  if (!deviceId) {
    throw new BadRequestError("Missing device_id parameter", "DEVICE_ID_MISSING");
  }

  // Look for a ready (unused, unexpired) handoff code for this device
  const [handoffCode] = await db
    .select()
    .from(deviceHandoffCodes)
    .where(
      and(
        eq(deviceHandoffCodes.deviceId, deviceId),
        eq(deviceHandoffCodes.used, false)
      )
    )
    .limit(1);

  if (!handoffCode) {
    return c.json({
      status: "pending",
      message: "Waiting for user to authenticate in browser",
    });
  }

  // Check if expired
  if (handoffCode.expiresAt < new Date()) {
    return c.json({
      status: "expired",
      message: "Authentication session expired. Please try again.",
    });
  }

  // Code is ready!
  return c.json({
    status: "ready",
    code: handoffCode.code,
    expiresAt: handoffCode.expiresAt.toISOString(),
  });
});

// GET /auth/login - Redirect to Next.js frontend sign-in page
auth.get("/login", async (c) => {
  const deviceId = c.req.query("device_id");

  if (!deviceId) {
    return c.json({ error: "Missing device_id parameter" }, 400);
  }

  // Redirect to our Next.js frontend sign-in page
  // Always use fresh=true to sign out any existing Clerk session first
  // This allows different users to log in on shared devices
  const webUrl = env.WEB_URL || "http://localhost:3001";
  const signInUrl = `${webUrl}/sign-in?device_id=${encodeURIComponent(deviceId)}&fresh=true`;

  return c.redirect(signInUrl);
});

// GET /auth/complete - Called after Clerk auth, creates handoff code
auth.get("/complete", async (c) => {
  const deviceId = c.req.query("device_id");

  if (!deviceId) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Missing device ID</h1>
          <p>Authentication failed. Please try again from the app.</p>
        </body>
      </html>
    `);
  }

  // Serve a page that will get the Clerk session and complete the handoff
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Completing Sign In - SurgicalAR</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
          }
          h1 { margin-bottom: 0.5rem; }
          .status { color: #aaa; margin: 2rem 0; }
          .success {
            background: #10b981;
            padding: 2rem;
            border-radius: 12px;
            display: none;
          }
          .success h2 { margin-top: 0; }
          .error {
            background: #ef4444;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 1rem;
            display: none;
          }
          .spinner {
            border: 3px solid #333;
            border-top: 3px solid #10b981;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>SurgicalAR</h1>

          <div id="loading">
            <div class="spinner"></div>
            <p class="status">Completing sign in...</p>
          </div>

          <div id="success" class="success">
            <h2>Success!</h2>
            <p>You can now close this window and return to SurgicalAR.</p>
            <p>The app will automatically log you in.</p>
          </div>

          <div id="error" class="error"></div>
        </div>

        <script>
          const deviceId = "${deviceId}";
          const backendUrl = "${env.APP_URL}";
          const clerkPubKey = "${env.CLERK_PUBLISHABLE_KEY}";
        </script>
        <script>
          // Load Clerk JS to get the session token
          (function() {
            const script = document.createElement('script');
            script.setAttribute('data-clerk-publishable-key', clerkPubKey);
            script.async = true;
            script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
            script.crossOrigin = 'anonymous';
            script.onload = initClerk;
            script.onerror = function() {
              showError('Failed to load authentication library');
            };
            document.head.appendChild(script);
          })();

          async function initClerk() {
            try {
              const Clerk = window.Clerk;
              if (!Clerk) {
                throw new Error('Clerk not available');
              }

              await Clerk.load();

              // Check if user is signed in
              if (!Clerk.user || !Clerk.session) {
                throw new Error('Not signed in. Please try again.');
              }

              // Get the session token
              const token = await Clerk.session.getToken();
              if (!token) {
                throw new Error('Could not get session token');
              }

              // Call our callback endpoint to create handoff code
              const response = await fetch(backendUrl + '/auth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  deviceId: deviceId,
                  clerkSessionToken: token
                })
              });

              const data = await response.json();

              if (data.success) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('success').style.display = 'block';

                // Try deep link redirect after a short delay
                const deepLink = data.deepLink;
                if (deepLink) {
                  setTimeout(() => { window.location.href = deepLink; }, 1500);
                }
              } else {
                throw new Error(data.error || 'Authentication failed');
              }
            } catch (err) {
              console.error('Auth completion error:', err);
              showError(err.message || 'Authentication failed');
            }
          }

          function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').textContent = message;
            document.getElementById('error').style.display = 'block';
          }
        </script>
      </body>
    </html>
  `;

  return c.html(html);
});

// Schema for callback request (from browser after Clerk auth)
const callbackSchema = z.object({
  deviceId: z.string().min(8).max(64),
  clerkSessionToken: z.string().min(1),
});

// POST /auth/callback - Generate handoff code after Clerk auth in browser
auth.post("/callback", zValidator("json", callbackSchema), async (c) => {
  const { deviceId, clerkSessionToken } = c.req.valid("json");

  console.log(`[auth/callback] Starting for deviceId: ${deviceId}`);

  // Verify Clerk session token (JWT)
  let clerkSession: { id?: string; userId: string };
  try {
    const verifiedToken = await verifyToken(clerkSessionToken, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    clerkSession = { id: verifiedToken.sid, userId: verifiedToken.sub! };
    console.log(`[auth/callback] Clerk session verified - userId: ${clerkSession.userId}`);
  } catch {
    throw new UnauthorizedError("Invalid Clerk session", "CLERK_SESSION_INVALID");
  }

  if (!clerkSession?.userId) {
    throw new UnauthorizedError("Invalid Clerk session", "CLERK_SESSION_INVALID");
  }

  // Ensure user exists in our database (handle race conditions with webhook)
  // Filter by deletedAt to exclude soft-deleted users
  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, clerkSession.userId), isNull(users.deletedAt)))
    .limit(1);

  console.log(`[auth/callback] Existing user by Clerk ID: ${existingUser ? existingUser.id : 'NOT FOUND'}`);

  if (!existingUser) {
    // User should be created via webhook, but handle edge case
    const clerkUser = await clerkClient.users.getUser(clerkSession.userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    console.log(`[auth/callback] Fetched Clerk user - email: ${email}`);

    // Check if user exists by email (including soft-deleted users)
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    console.log(`[auth/callback] Existing user by email: ${existingByEmail ? existingByEmail.id : 'NOT FOUND'}, deletedAt: ${existingByEmail?.deletedAt ?? 'null'}`);

    if (existingByEmail) {
      // User already exists with this email - update profile and reactivate if soft-deleted
      console.log(`[auth/callback] Updating existing user ${existingByEmail.id} with Clerk profile${existingByEmail.deletedAt ? ' (reactivating soft-deleted user)' : ''}`);
      await db.update(users)
        .set({
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          emailVerified: clerkUser.emailAddresses[0]?.verification?.status === "verified",
          deletedAt: null, // Reactivate if soft-deleted
          updatedAt: new Date(),
        })
        .where(eq(users.email, email));

      // Use the existing user's ID for the rest of the flow
      clerkSession.userId = existingByEmail.id;
    } else {
      // Create new user
      console.log(`[auth/callback] Creating new user with Clerk ID: ${clerkUser.id}`);
      await db.insert(users).values({
        id: clerkUser.id,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
        emailVerified: clerkUser.emailAddresses[0]?.verification?.status === "verified",
      });
    }
  }

  console.log(`[auth/callback] Final userId for handoff: ${clerkSession.userId}`);

  // Ensure user has a personal org (org-of-one for free/pro individuals)
  // This creates the org in Clerk and syncs to our DB with initial credits
  await ensurePersonalOrg(clerkSession.userId);

  // Clean up any existing unused handoff codes for this device
  await cleanupDeviceHandoffCodes(deviceId);

  // Create new handoff code
  const result = await createHandoffCode({
    userId: clerkSession.userId,
    deviceId,
    clerkSessionId: clerkSession.id,
  });

  return c.json({
    success: true,
    code: result.code,
    deepLink: result.deepLink,
    expiresAt: result.expiresAt.toISOString(),
  });
});

// Schema for device token exchange
const deviceTokenSchema = z.object({
  code: z.string().min(8).max(24),
  deviceInfo: z
    .object({
      name: z.string().optional(),
      deviceType: z.enum(["desktop", "xr", "mobile", "web"]).optional(),
      platform: z
        .enum(["windows", "macos", "linux", "ios", "android", "quest", "visionpro", "web"])
        .optional(),
      appVersion: z.string().optional(),
      osVersion: z.string().optional(),
    })
    .optional(),
});

// POST /auth/device-token - Exchange handoff code for session tokens
auth.post("/device-token", zValidator("json", deviceTokenSchema), async (c) => {
  const deviceId = c.req.header(DEVICE_ID_HEADER);

  if (!deviceId) {
    throw new BadRequestError(`Missing ${DEVICE_ID_HEADER} header`, "DEVICE_ID_MISSING");
  }

  const { code, deviceInfo } = c.req.valid("json");

  // Validate and consume handoff code
  const validatedCode = await validateAndConsumeHandoffCode({
    code,
    deviceId,
  });

  // Create session
  const tokens = await createSession({
    userId: validatedCode.userId,
    deviceId,
    clerkSessionId: validatedCode.clerkSessionId ?? undefined,
    ipAddress: c.req.header("X-Forwarded-For") ?? c.req.header("CF-Connecting-IP"),
    userAgent: c.req.header("User-Agent"),
    deviceInfo,
  });

  // Get user info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, validatedCode.userId))
    .limit(1);

  // Get organization membership
  const [membership] = await db
    .select({
      organizationId: orgMembers.organizationId,
      role: orgMembers.role,
      organizationName: organizations.name,
      tier: organizations.tier,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(eq(orgMembers.userId, validatedCode.userId), isNull(organizations.deletedAt))
    )
    .limit(1);

  return c.json({
    success: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt.toISOString(),
    refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    },
    organization: membership
      ? {
          id: membership.organizationId,
          name: membership.organizationName,
          role: membership.role,
          tier: membership.tier,
        }
      : null,
  });
});

// Schema for refresh
const refreshSchema = z.object({
  refreshToken: z.string().min(16),
});

// POST /auth/refresh - Refresh expired tokens
auth.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid("json");

  const tokens = await refreshSession({
    refreshToken,
    ipAddress: c.req.header("X-Forwarded-For") ?? c.req.header("CF-Connecting-IP"),
    userAgent: c.req.header("User-Agent"),
  });

  return c.json({
    success: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt.toISOString(),
    refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
  });
});

// GET /auth/me - Get current user info + entitlements
auth.get("/me", authMiddleware, async (c) => {
  const authUser = c.get("user");

  // Get full user info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  // Get entitlements
  let entitlements = null;
  let balance = null;

  if (authUser.organizationId) {
    entitlements = await getEntitlements(authUser.id, authUser.organizationId);
    balance = await getBalance(authUser.organizationId);
  }

  // Get user's devices
  const userDevices = await db
    .select({
      id: devices.id,
      name: devices.name,
      deviceType: devices.deviceType,
      platform: devices.platform,
      lastActiveAt: devices.lastActiveAt,
      isActive: devices.isActive,
    })
    .from(devices)
    .where(and(eq(devices.userId, authUser.id), eq(devices.isActive, true)));

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      emailVerified: user.emailVerified,
    },
    organization: authUser.organizationId
      ? {
          id: authUser.organizationId,
          role: authUser.organizationRole,
        }
      : null,
    entitlements,
    credits: balance,
    devices: userDevices,
    currentDeviceId: authUser.deviceId,
  });
});

// POST /auth/logout - Invalidate current session
auth.post("/logout", authMiddleware, async (c) => {
  const authUser = c.get("user");

  await revokeSession(authUser.sessionId);

  return c.json({
    success: true,
    message: "Logged out successfully",
  });
});

// POST /auth/logout-all - Invalidate all sessions for user
auth.post("/logout-all", authMiddleware, async (c) => {
  const authUser = c.get("user");

  // Import here to avoid circular dependency
  const { revokeAllUserSessions } = await import("../services/auth/session.js");
  const count = await revokeAllUserSessions(authUser.id);

  return c.json({
    success: true,
    message: `Logged out from ${count} sessions`,
    sessionsRevoked: count,
  });
});

export default auth;
