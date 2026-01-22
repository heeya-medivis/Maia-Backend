import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // Clerk
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default("maia.surgicalar.com"),
  JWT_AUDIENCE: z.string().default("surgicalar-client"),

  // Session
  SESSION_TOKEN_EXPIRY_HOURS: z.coerce.number().default(24),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(30),
  HANDOFF_CODE_EXPIRY_MINUTES: z.coerce.number().default(10),

  // AI Providers (optional, can be added later)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Stripe (deferred to v2)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // App
  APP_URL: z.string().url().default("https://maia.surgicalar.com"),
  WEB_URL: z.string().url().default("http://localhost:3001"),
  DEEP_LINK_SCHEME: z.string().default("maia"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Environment validation failed:");
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
