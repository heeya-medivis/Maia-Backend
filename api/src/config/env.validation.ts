import { z } from "zod";

/**
 * Environment configuration schema
 * Validates all required environment variables
 */
export const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT (RS256 asymmetric keys)
  // Keys may have literal \n in .env files that need to be converted to newlines
  JWT_PRIVATE_KEY: z
    .string()
    .min(1, "JWT_PRIVATE_KEY is required")
    .transform((val) => val.replace(/\\n/g, "\n")),
  JWT_PUBLIC_KEY: z
    .string()
    .min(1, "JWT_PUBLIC_KEY is required")
    .transform((val) => val.replace(/\\n/g, "\n")),
  JWT_KEY_ID: z.string().min(1, "JWT_KEY_ID is required"),
  JWT_ISSUER: z.string().default("maia.surgicalar.com"),
  JWT_AUDIENCE: z.string().default("maia-api"),

  // Token TTLs
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(600), // 10 minutes
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().default(2592000), // 30 days

  // Auth state secret (for OAuth state encryption)
  AUTH_STATE_SECRET: z
    .string()
    .min(32, "AUTH_STATE_SECRET must be at least 32 characters"),
  // Separate secret for refresh token signing (defaults to AUTH_STATE_SECRET)
  REFRESH_TOKEN_SECRET: z.string().min(32).optional(),

  // Allowed OAuth client IDs (comma-separated)
  ALLOWED_CLIENT_IDS: z
    .string()
    .optional()
    .transform((val) =>
      val !== undefined && val !== ""
        ? val.split(",").map((id) => id.trim())
        : ["maia-web", "maia_desktop"],
    ),

  // WorkOS Authentication
  WORKOS_API_KEY: z.string().min(1, "WORKOS_API_KEY is required"),
  WORKOS_CLIENT_ID: z.string().min(1, "WORKOS_CLIENT_ID is required"),
  WORKOS_REDIRECT_URI: z
    .string()
    .url()
    .default("http://localhost:3000/v1/oauth/callback"),
  WORKOS_WEBHOOK_SECRET: z.string().optional(),

  // WorkOS OIDC connections for social login
  WORKOS_GOOGLE_CONNECTION_ID: z.string().optional(),
  WORKOS_MICROSOFT_CONNECTION_ID: z.string().optional(),
  WORKOS_APPLE_CONNECTION_ID: z.string().optional(),

  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Google Cloud (for Vertex AI)
  GCLOUD_PROJECT_ID: z.string().optional(),
  GCLOUD_SERVER_LOCATION: z.string().optional(),
  GCLOUD_CLIENT_EMAIL: z.string().optional(),
  GCLOUD_PRIVATE_KEY_ID: z.string().optional(),
  GCLOUD_PRIVATE_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // URLs
  API_URL: z.string().url().default("http://localhost:3000"),
  WEB_URL: z.string().url().default("http://localhost:3001"),

  // Web Dashboard OAuth Redirect URIs (comma-separated)
  WEB_REDIRECT_URIS: z
    .string()
    .optional()
    .transform((val) =>
      val !== undefined && val !== ""
        ? val.split(",").map((uri) => uri.trim())
        : [],
    ),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:3001"),

  // Admin Seeding (optional)
  ADMIN_SEED_EMAIL: z.string().email().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment configuration");
  }

  return result.data;
}
