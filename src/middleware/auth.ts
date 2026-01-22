import { Context, Next } from "hono";
import * as jose from "jose";
import { env } from "../config/env.js";
import { UnauthorizedError } from "./error.js";
import { db } from "../db/index.js";
import { sessions, users, devices, orgMembers, organizations } from "../db/schema/index.js";
import { eq, and, gt, isNull } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  sessionId: string;
  deviceId: string;
  organizationId?: string;
  organizationRole?: "owner" | "admin" | "member";
}

// Extend Hono context with auth user
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    deviceId: string;
  }
}

interface SessionPayload extends jose.JWTPayload {
  sid: string; // session ID
  did: string; // device ID
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  try {
    // Verify JWT
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    const sessionPayload = payload as SessionPayload;

    // Validate session in database
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionPayload.sid),
          eq(sessions.isRevoked, false),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      throw new UnauthorizedError("Session expired or revoked", "SESSION_INVALID");
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError("User not found", "USER_NOT_FOUND");
    }

    // Get device
    const [device] = await db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.id, session.deviceId),
          eq(devices.isActive, true),
          isNull(devices.revokedAt)
        )
      )
      .limit(1);

    if (!device) {
      throw new UnauthorizedError("Device not found or revoked", "DEVICE_INVALID");
    }

    // Get organization membership (first one for now - can be enhanced later)
    const [membership] = await db
      .select({
        organizationId: orgMembers.organizationId,
        role: orgMembers.role,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(orgMembers.userId, user.id),
          isNull(organizations.deletedAt)
        )
      )
      .limit(1);

    // Update session last active
    await db
      .update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.id, session.id));

    // Update device last active
    await db
      .update(devices)
      .set({ lastActiveAt: new Date() })
      .where(eq(devices.id, device.id));

    // Set auth user in context
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      sessionId: session.id,
      deviceId: device.id,
      organizationId: membership?.organizationId,
      organizationRole: membership?.role,
    };

    c.set("user", authUser);
    c.set("deviceId", device.id);

    await next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (error instanceof jose.errors.JWTExpired) {
      throw new UnauthorizedError("Token expired", "TOKEN_EXPIRED");
    }
    if (error instanceof jose.errors.JWTInvalid) {
      throw new UnauthorizedError("Invalid token", "TOKEN_INVALID");
    }
    throw new UnauthorizedError("Authentication failed");
  }
}

// Optional auth - doesn't throw if no token, just doesn't set user
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await next();
    return;
  }

  try {
    await authMiddleware(c, next);
  } catch {
    // Silently continue without auth for optional routes
    await next();
  }
}

// Require organization membership
export async function requireOrgMiddleware(c: Context, next: Next) {
  const user = c.get("user");

  if (!user.organizationId) {
    throw new UnauthorizedError("Organization membership required", "ORG_REQUIRED");
  }

  await next();
}

// Require specific organization roles
export function requireOrgRole(...roles: ("owner" | "admin" | "member")[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user.organizationId) {
      throw new UnauthorizedError("Organization membership required", "ORG_REQUIRED");
    }

    if (!user.organizationRole || !roles.includes(user.organizationRole)) {
      throw new UnauthorizedError("Insufficient permissions", "INSUFFICIENT_ROLE");
    }

    await next();
  };
}
