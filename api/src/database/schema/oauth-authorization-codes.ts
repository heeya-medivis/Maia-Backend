import {
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { authProtocolEnum } from './auth-connections';

/**
 * OAuth Authorization Codes table
 * Stores temporary authorization codes for OAuth 2.0 + PKCE flow
 * Codes are single-use and expire after 10 minutes
 */
export const oauthAuthorizationCodes = pgTable(
  'oauth_authorization_codes',
  {
    id: text('id').primaryKey(), // The authorization code itself (nanoid)

    // User who authenticated (set after WorkOS callback)
    userId: text('user_id'),

    // Client info
    clientId: text('client_id').notNull(),
    redirectUri: text('redirect_uri').notNull(),

    // PKCE
    codeChallenge: text('code_challenge').notNull(),
    codeChallengeMethod: text('code_challenge_method').notNull().default('S256'),

    // Scopes requested
    scopes: text('scopes').notNull().default('openid email profile'),

    // Auth method used
    authMethod: authProtocolEnum('auth_method'),

    // Device info (for Unity/desktop clients)
    deviceId: text('device_id'),
    devicePlatform: text('device_platform'),
    deviceAppVersion: text('device_app_version'),

    // Lifecycle
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('oauth_codes_user_idx').on(table.userId),
    index('oauth_codes_expires_idx').on(table.expiresAt),
  ],
);

export type OAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferSelect;
export type NewOAuthAuthorizationCode = typeof oauthAuthorizationCodes.$inferInsert;
