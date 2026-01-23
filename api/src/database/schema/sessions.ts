import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { devices } from './devices';

/**
 * Sessions table - JWT session tokens for authenticated devices
 * Stores refresh tokens and session metadata
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(), // nanoid - session token ID
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    refreshToken: text('refresh_token').notNull().unique(),
    clerkSessionId: text('clerk_session_id'), // Link to Clerk session
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }).notNull(),
    isRevoked: boolean('is_revoked').default(false).notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdDateTime: timestamp('created_date_time', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_device_idx').on(table.deviceId),
    index('sessions_refresh_token_idx').on(table.refreshToken),
    index('sessions_expires_idx').on(table.expiresAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
