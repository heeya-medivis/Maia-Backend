import { z } from 'zod';

/**
 * Environment configuration schema
 * Validates all required environment variables
 */
export const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('maia.surgicalar.com'),
  JWT_AUDIENCE: z.string().default('surgicalar-client'),
  JWT_EXPIRATION: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('30d'),

  // Session
  SESSION_TOKEN_EXPIRY_HOURS: z.coerce.number().default(24),
  REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().default(30),
  HANDOFF_CODE_EXPIRY_MINUTES: z.coerce.number().default(10),

  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // URLs
  API_URL: z.string().url().default('http://localhost:3000'),
  WEB_URL: z.string().url().default('http://localhost:3001'),
  DEEP_LINK_SCHEME: z.string().default('maia'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}
