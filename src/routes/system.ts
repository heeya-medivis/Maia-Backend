import { Hono } from "hono";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

const system = new Hono();

// GET /health - Basic health check
system.get("/health", async (c) => {
  const checks = {
    status: "ok" as "ok" | "degraded" | "unhealthy",
    timestamp: new Date().toISOString(),
    checks: {
      api: true,
      database: false,
    },
  };

  // Check database connectivity
  try {
    await db.execute(sql`SELECT 1`);
    checks.checks.database = true;
  } catch {
    checks.status = "degraded";
  }

  if (!checks.checks.api || !checks.checks.database) {
    checks.status = "unhealthy";
  }

  const statusCode = checks.status === "ok" ? 200 : checks.status === "degraded" ? 200 : 503;

  return c.json(checks, statusCode);
});

// GET /api/version - API version info
system.get("/api/version", (c) => {
  return c.json({
    version: "1.0.0",
    name: "Maia API",
    environment: process.env.NODE_ENV ?? "development",
  });
});

// GET / - Root endpoint
system.get("/", (c) => {
  return c.json({
    name: "Maia API",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      health: {
        method: "GET",
        path: "/health",
        description: "Health check endpoint",
        auth: false,
      },
      auth: {
        callback: {
          method: "POST",
          path: "/auth/callback",
          description: "Generate handoff code after Clerk auth",
          auth: false,
          body: {
            deviceId: "string (8-64 chars)",
            clerkSessionToken: "string (Clerk JWT)",
          },
        },
        deviceToken: {
          method: "POST",
          path: "/auth/device-token",
          description: "Exchange handoff code for session token",
          auth: false,
          headers: {
            "X-Device-ID": "string (required)",
          },
          body: {
            code: "string (8-24 chars)",
            deviceInfo: "object (optional)",
          },
        },
        refresh: {
          method: "POST",
          path: "/auth/refresh",
          description: "Refresh expired tokens",
          auth: false,
          body: {
            refreshToken: "string (min 16 chars)",
          },
        },
        me: {
          method: "GET",
          path: "/auth/me",
          description: "Get current user info",
          auth: true,
          headers: {
            Authorization: "Bearer <token>",
          },
        },
      },
    },
  });
});

export default system;
