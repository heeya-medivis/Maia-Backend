import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import { secureHeaders } from "hono/secure-headers";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";

// Routes
import authRoutes from "./routes/auth.js";
import devicesRoutes from "./routes/devices.js";
import creditsRoutes from "./routes/credits.js";
import entitlementsRoutes from "./routes/entitlements.js";
import maiaRoutes from "./routes/maia.js";
import systemRoutes from "./routes/system.js";
import devRoutes from "./routes/dev.js";

// Webhooks
import clerkWebhooks from "./webhooks/clerk.js";
import stripeWebhooks from "./webhooks/stripe.js";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", timing());
app.use("*", secureHeaders());

// CORS configuration
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow requests from Unity client (no origin) and configured origins
      if (!origin) return "*";

      const allowedOrigins = [
        env.APP_URL,
        "https://surgicalar.com",
        "https://*.surgicalar.com",
      ];

      // Check if origin matches any allowed pattern
      for (const allowed of allowedOrigins) {
        if (allowed.includes("*")) {
          const regex = new RegExp("^" + allowed.replace(/\*/g, ".*") + "$");
          if (regex.test(origin)) return origin;
        } else if (origin === allowed) {
          return origin;
        }
      }

      // In development, allow localhost
      if (env.NODE_ENV === "development" && origin.includes("localhost")) {
        return origin;
      }

      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Device-ID"],
    exposeHeaders: ["X-Request-Id"],
    credentials: true,
    maxAge: 86400,
  })
);

// Mount routes
app.route("/", systemRoutes);
app.route("/auth", authRoutes);
app.route("/devices", devicesRoutes);
app.route("/credits", creditsRoutes);
app.route("/entitlements", entitlementsRoutes);
app.route("/maia", maiaRoutes);
app.route("/dev", devRoutes);

// Webhooks (no CORS needed)
app.route("/webhooks/clerk", clerkWebhooks);
app.route("/webhooks/stripe", stripeWebhooks);

// Error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        message: "Not found",
        code: "NOT_FOUND",
      },
    },
    404
  );
});

export default app;
