import { nanoid } from "nanoid";
import * as jose from "jose";
import { db } from "../../db/index.js";
import { sessions, devices, users } from "../../db/schema/index.js";
import { env } from "../../config/env.js";
import { eq, and, isNull } from "drizzle-orm";
import { NotFoundError, UnauthorizedError } from "../../middleware/error.js";

export interface CreateSessionParams {
  userId: string;
  deviceId: string;
  clerkSessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    name?: string;
    deviceType?: "desktop" | "xr" | "mobile" | "web";
    platform?: "windows" | "macos" | "linux" | "ios" | "android" | "quest" | "visionpro" | "web";
    appVersion?: string;
    osVersion?: string;
  };
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export async function createSession(
  params: CreateSessionParams
): Promise<SessionTokens> {
  const { userId, deviceId, clerkSessionId, ipAddress, userAgent, deviceInfo } = params;

  console.log(`[createSession] Looking up user - userId: ${userId}, deviceId: ${deviceId}`);

  // Verify user exists
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    // Debug: check if user exists with different deletedAt state
    const [anyUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    console.error(`[createSession] User not found - userId: ${userId}, anyUserExists: ${!!anyUser}, anyUserDeletedAt: ${anyUser?.deletedAt}`);
    throw new NotFoundError("User not found", "USER_NOT_FOUND");
  }

  console.log(`[createSession] Found user - id: ${user.id}, email: ${user.email}`);

  // Create or update device
  const existingDevice = await db
    .select()
    .from(devices)
    .where(eq(devices.id, deviceId))
    .limit(1);

  if (existingDevice.length === 0) {
    // Create new device
    await db.insert(devices).values({
      id: deviceId,
      userId,
      name: deviceInfo?.name,
      deviceType: deviceInfo?.deviceType,
      platform: deviceInfo?.platform,
      appVersion: deviceInfo?.appVersion,
      osVersion: deviceInfo?.osVersion,
      lastActiveAt: new Date(),
    });
  } else {
    // Update existing device
    await db
      .update(devices)
      .set({
        userId,
        name: deviceInfo?.name ?? existingDevice[0].name,
        deviceType: deviceInfo?.deviceType ?? existingDevice[0].deviceType,
        platform: deviceInfo?.platform ?? existingDevice[0].platform,
        appVersion: deviceInfo?.appVersion ?? existingDevice[0].appVersion,
        osVersion: deviceInfo?.osVersion ?? existingDevice[0].osVersion,
        lastActiveAt: new Date(),
        isActive: true,
        revokedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId));
  }

  // Revoke existing sessions for this device
  await db
    .update(sessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
    })
    .where(and(eq(sessions.deviceId, deviceId), eq(sessions.isRevoked, false)));

  // Generate tokens
  const sessionId = nanoid();
  const refreshToken = nanoid(32);

  const expiresAt = new Date(
    Date.now() + env.SESSION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );
  const refreshExpiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Create session record
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    deviceId,
    refreshToken,
    clerkSessionId: clerkSessionId ?? null,
    expiresAt,
    refreshExpiresAt,
    ipAddress,
    userAgent,
  });

  // Generate JWT access token
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const accessToken = await new jose.SignJWT({
    sid: sessionId,
    did: deviceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setExpirationTime(expiresAt)
    .setSubject(userId)
    .sign(secret);

  return {
    accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
  };
}

export interface RefreshSessionParams {
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function refreshSession(
  params: RefreshSessionParams
): Promise<SessionTokens> {
  const { refreshToken, ipAddress, userAgent } = params;

  // Find session by refresh token
  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.refreshToken, refreshToken),
        eq(sessions.isRevoked, false)
      )
    )
    .limit(1);

  if (!session) {
    throw new UnauthorizedError("Invalid refresh token", "REFRESH_TOKEN_INVALID");
  }

  // Check if refresh token expired
  if (session.refreshExpiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expired", "REFRESH_TOKEN_EXPIRED");
  }

  // Revoke old session
  await db
    .update(sessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
    })
    .where(eq(sessions.id, session.id));

  // Create new session
  return createSession({
    userId: session.userId,
    deviceId: session.deviceId,
    clerkSessionId: session.clerkSessionId ?? undefined,
    ipAddress,
    userAgent,
  });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId));
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await db
    .update(sessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
    })
    .where(and(eq(sessions.userId, userId), eq(sessions.isRevoked, false)));

  return result.count ?? 0;
}

export async function revokeDeviceSessions(deviceId: string): Promise<number> {
  const result = await db
    .update(sessions)
    .set({
      isRevoked: true,
      revokedAt: new Date(),
    })
    .where(and(eq(sessions.deviceId, deviceId), eq(sessions.isRevoked, false)));

  return result.count ?? 0;
}
