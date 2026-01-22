import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../db/index.js";
import { devices } from "../db/schema/index.js";
import { eq, and, isNull } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { NotFoundError, ForbiddenError } from "../middleware/error.js";
import { revokeDeviceSessions } from "../services/auth/session.js";

const devicesRouter = new Hono();

// All routes require auth
devicesRouter.use("*", authMiddleware);

// GET /devices - List user's devices
devicesRouter.get("/", async (c) => {
  const authUser = c.get("user");

  const userDevices = await db
    .select({
      id: devices.id,
      name: devices.name,
      deviceType: devices.deviceType,
      platform: devices.platform,
      appVersion: devices.appVersion,
      osVersion: devices.osVersion,
      lastActiveAt: devices.lastActiveAt,
      isActive: devices.isActive,
      createdAt: devices.createdAt,
    })
    .from(devices)
    .where(
      and(
        eq(devices.userId, authUser.id),
        isNull(devices.revokedAt)
      )
    );

  return c.json({
    devices: userDevices.map((d) => ({
      ...d,
      isCurrent: d.id === authUser.deviceId,
    })),
  });
});

// GET /devices/:id - Get device details
devicesRouter.get("/:id", async (c) => {
  const authUser = c.get("user");
  const deviceId = c.req.param("id");

  const [device] = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.id, deviceId),
        eq(devices.userId, authUser.id)
      )
    )
    .limit(1);

  if (!device) {
    throw new NotFoundError("Device not found", "DEVICE_NOT_FOUND");
  }

  return c.json({
    device: {
      id: device.id,
      name: device.name,
      deviceType: device.deviceType,
      platform: device.platform,
      appVersion: device.appVersion,
      osVersion: device.osVersion,
      lastActiveAt: device.lastActiveAt,
      isActive: device.isActive,
      createdAt: device.createdAt,
      isCurrent: device.id === authUser.deviceId,
    },
  });
});

// Update device schema
const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// PATCH /devices/:id - Update device info
devicesRouter.patch("/:id", zValidator("json", updateDeviceSchema), async (c) => {
  const authUser = c.get("user");
  const deviceId = c.req.param("id");
  const updates = c.req.valid("json");

  const [device] = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.id, deviceId),
        eq(devices.userId, authUser.id)
      )
    )
    .limit(1);

  if (!device) {
    throw new NotFoundError("Device not found", "DEVICE_NOT_FOUND");
  }

  await db
    .update(devices)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(devices.id, deviceId));

  return c.json({
    success: true,
    message: "Device updated",
  });
});

// DELETE /devices/:id - Revoke device
devicesRouter.delete("/:id", async (c) => {
  const authUser = c.get("user");
  const deviceId = c.req.param("id");

  // Can't revoke current device
  if (deviceId === authUser.deviceId) {
    throw new ForbiddenError(
      "Cannot revoke current device. Use logout instead.",
      "CANNOT_REVOKE_CURRENT_DEVICE"
    );
  }

  const [device] = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.id, deviceId),
        eq(devices.userId, authUser.id)
      )
    )
    .limit(1);

  if (!device) {
    throw new NotFoundError("Device not found", "DEVICE_NOT_FOUND");
  }

  // Revoke all sessions for this device
  await revokeDeviceSessions(deviceId);

  // Mark device as revoked
  await db
    .update(devices)
    .set({
      isActive: false,
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(devices.id, deviceId));

  return c.json({
    success: true,
    message: "Device revoked",
  });
});

export default devicesRouter;
