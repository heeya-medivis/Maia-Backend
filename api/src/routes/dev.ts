import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { env } from "../config/env.js";
import { db } from "../db/index.js";
import { users, organizations, orgMembers, creditBalances } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { createSession } from "../services/auth/session.js";
import { ensurePersonalOrg } from "../services/org/personal-org.js";
import { nanoid } from "nanoid";

const dev = new Hono();

// Only allow in development
dev.use("*", async (c, next) => {
  if (env.NODE_ENV !== "development") {
    return c.json({ error: "Dev routes only available in development mode" }, 403);
  }
  return next();
});

// Schema for test token request
const testTokenSchema = z.object({
  userId: z.string().min(1),
  deviceName: z.string().optional().default("Postman Test Device"),
});

// POST /dev/test-token - Generate a test token for a user (dev only)
dev.post("/test-token", zValidator("json", testTokenSchema), async (c) => {
  const { userId, deviceName } = c.req.valid("json");

  // Check if user exists
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ error: "User not found", availableUsers: "Use GET /dev/users to list" }, 404);
  }

  // Generate a test device ID
  const deviceId = `test-device-${nanoid(8)}`;

  // Create session
  const tokens = await createSession({
    userId: user.id,
    deviceId,
    deviceInfo: {
      name: deviceName,
      deviceType: "web",
      platform: "web",
    },
  });

  return c.json({
    message: "Test token generated successfully",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    deviceId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt.toISOString(),
    refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
    usage: {
      header: "Authorization: Bearer <accessToken>",
      deviceHeader: "X-Device-ID: " + deviceId,
    },
  });
});

// GET /dev/users - List all users (dev only)
dev.get("/users", async (c) => {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      personalOrgId: users.personalOrgId,
      createdAt: users.createdAt,
    })
    .from(users)
    .limit(50);

  return c.json({ users: allUsers });
});

// POST /dev/ensure-personal-org - Create personal org for a user (dev only)
const ensurePersonalOrgSchema = z.object({
  userId: z.string().min(1),
});

dev.post("/ensure-personal-org", zValidator("json", ensurePersonalOrgSchema), async (c) => {
  const { userId } = c.req.valid("json");

  try {
    const result = await ensurePersonalOrg(userId);

    // Get the org details
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, result.organizationId))
      .limit(1);

    // Get credit balances
    const balances = await db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.organizationId, result.organizationId));

    // Get user's updated info
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        personalOrgId: users.personalOrgId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return c.json({
      success: true,
      isNew: result.isNew,
      user,
      organization: org,
      creditBalances: balances,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, 400);
  }
});

// GET /dev/orgs - List all organizations (dev only)
dev.get("/orgs", async (c) => {
  const allOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      tier: organizations.tier,
      metadata: organizations.metadata,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .limit(50);

  return c.json({ organizations: allOrgs });
});

// GET /dev/db-status - Show database table counts (dev only)
dev.get("/db-status", async (c) => {
  const [userCount] = await db.select({ count: users.id }).from(users);
  const [orgCount] = await db.select({ count: organizations.id }).from(organizations);
  const [memberCount] = await db.select({ count: orgMembers.userId }).from(orgMembers);

  return c.json({
    tables: {
      users: userCount ? 1 : 0,
      organizations: orgCount ? 1 : 0,
      orgMembers: memberCount ? 1 : 0,
    },
  });
});

export default dev;
