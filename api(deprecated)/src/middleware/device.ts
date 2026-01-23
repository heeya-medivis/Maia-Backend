import { Context, Next } from "hono";
import { BadRequestError } from "./error.js";

// Header name for device ID
export const DEVICE_ID_HEADER = "X-Device-ID";

// Validate device ID format (UUID or similar)
const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;

export async function deviceIdMiddleware(c: Context, next: Next) {
  const deviceId = c.req.header(DEVICE_ID_HEADER);

  if (!deviceId) {
    throw new BadRequestError(
      `Missing ${DEVICE_ID_HEADER} header`,
      "DEVICE_ID_MISSING"
    );
  }

  if (!DEVICE_ID_REGEX.test(deviceId)) {
    throw new BadRequestError(
      `Invalid ${DEVICE_ID_HEADER} format`,
      "DEVICE_ID_INVALID"
    );
  }

  c.set("deviceId", deviceId);
  await next();
}

// Optional device ID - doesn't throw if missing
export async function optionalDeviceIdMiddleware(c: Context, next: Next) {
  const deviceId = c.req.header(DEVICE_ID_HEADER);

  if (deviceId && DEVICE_ID_REGEX.test(deviceId)) {
    c.set("deviceId", deviceId);
  }

  await next();
}
