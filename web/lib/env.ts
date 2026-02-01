/**
 * Environment configuration with validation.
 * Throws at startup if critical env vars are missing in production.
 */

const isProduction = process.env.NODE_ENV === 'production';

// Validate SESSION_SECRET
if (!process.env.SESSION_SECRET) {
  if (isProduction) {
    throw new Error(
      'FATAL: SESSION_SECRET environment variable is required in production. ' +
      'Generate one with: openssl rand -base64 32'
    );
  }
  console.warn(
    '\x1b[33m%s\x1b[0m', // Yellow color
    '⚠️  WARNING: SESSION_SECRET not set. Using insecure default. DO NOT deploy to production!'
  );
}

export const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-only-insecure-secret-do-not-use-in-production';
export const SESSION_COOKIE = 'maia_session';
export const API_URL = process.env.API_URL ?? 'http://localhost:3000';
export const APP_URL = process.env.APP_URL ?? 'http://localhost:3001';
// OAuth client_id - must match JWT_AUDIENCE or be in ALLOWED_CLIENT_IDS on backend
export const CLIENT_ID = process.env.CLIENT_ID ?? 'maia-web';
