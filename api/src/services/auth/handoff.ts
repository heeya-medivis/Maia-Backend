import { nanoid } from "nanoid";
import { db } from "../../db/index.js";
import { deviceHandoffCodes } from "../../db/schema/index.js";
import { env } from "../../config/env.js";
import { eq, and, lt } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../../middleware/error.js";

// Generate a 12-character URL-safe handoff code
function generateHandoffCode(): string {
  return nanoid(12);
}

export interface CreateHandoffCodeParams {
  userId: string;
  deviceId: string;
  clerkSessionId?: string;
}

export interface HandoffCodeResult {
  code: string;
  expiresAt: Date;
  deepLink: string;
}

export async function createHandoffCode(
  params: CreateHandoffCodeParams
): Promise<HandoffCodeResult> {
  const code = generateHandoffCode();
  const expiresAt = new Date(
    Date.now() + env.HANDOFF_CODE_EXPIRY_MINUTES * 60 * 1000
  );

  await db.insert(deviceHandoffCodes).values({
    code,
    userId: params.userId,
    deviceId: params.deviceId,
    clerkSessionId: params.clerkSessionId,
    expiresAt,
  });

  const deepLink = `${env.DEEP_LINK_SCHEME}://auth/callback?code=${code}`;

  return {
    code,
    expiresAt,
    deepLink,
  };
}

export interface ValidateHandoffCodeParams {
  code: string;
  deviceId: string;
}

export interface ValidatedHandoffCode {
  userId: string;
  deviceId: string;
  clerkSessionId: string | null;
}

export async function validateAndConsumeHandoffCode(
  params: ValidateHandoffCodeParams
): Promise<ValidatedHandoffCode> {
  const { code, deviceId } = params;

  // Find the handoff code
  const [handoffCode] = await db
    .select()
    .from(deviceHandoffCodes)
    .where(eq(deviceHandoffCodes.code, code))
    .limit(1);

  if (!handoffCode) {
    throw new NotFoundError("Invalid handoff code", "HANDOFF_CODE_NOT_FOUND");
  }

  // Check if already used
  if (handoffCode.used) {
    throw new BadRequestError("Handoff code already used", "HANDOFF_CODE_USED");
  }

  // Check if expired
  if (handoffCode.expiresAt < new Date()) {
    throw new BadRequestError("Handoff code expired", "HANDOFF_CODE_EXPIRED");
  }

  // Check device ID matches
  if (handoffCode.deviceId !== deviceId) {
    throw new BadRequestError(
      "Device ID mismatch",
      "HANDOFF_CODE_DEVICE_MISMATCH"
    );
  }

  // Mark as used
  await db
    .update(deviceHandoffCodes)
    .set({
      used: true,
      usedAt: new Date(),
    })
    .where(eq(deviceHandoffCodes.code, code));

  return {
    userId: handoffCode.userId,
    deviceId: handoffCode.deviceId,
    clerkSessionId: handoffCode.clerkSessionId,
  };
}

// Cleanup expired handoff codes (can be called periodically)
export async function cleanupExpiredHandoffCodes(): Promise<number> {
  const result = await db
    .delete(deviceHandoffCodes)
    .where(lt(deviceHandoffCodes.expiresAt, new Date()));

  return result.count ?? 0;
}

// Cleanup unused codes for a specific device (prevent accumulation)
export async function cleanupDeviceHandoffCodes(deviceId: string): Promise<number> {
  const result = await db
    .delete(deviceHandoffCodes)
    .where(
      and(
        eq(deviceHandoffCodes.deviceId, deviceId),
        eq(deviceHandoffCodes.used, false)
      )
    );

  return result.count ?? 0;
}
