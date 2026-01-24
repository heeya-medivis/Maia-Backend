import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Device Handoff Codes table
 * Temporary codes for browser-to-device auth handoff
 */
export const deviceHandoffCodes = pgTable(
  'device_handoff_codes',
  {
    code: text('code').primaryKey(), // Short-lived code (nanoid 21 chars = ~126 bits entropy)
    pollToken: text('poll_token').notNull(), // Secret token Unity must provide when polling (prevents device_id guessing)
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull(), // Device ID from initial request
    clerkSessionId: text('clerk_session_id'), // Clerk session for validation
    used: boolean('used').default(false).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdDateTime: timestamp('created_date_time', { withTimezone: true })
      .defaultNow()
      .notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => [
    index('handoff_codes_user_idx').on(table.userId),
    index('handoff_codes_device_idx').on(table.deviceId),
    index('handoff_codes_expires_idx').on(table.expiresAt),
    index('handoff_codes_poll_token_idx').on(table.pollToken),
  ],
);

export type DeviceHandoffCode = typeof deviceHandoffCodes.$inferSelect;
export type NewDeviceHandoffCode = typeof deviceHandoffCodes.$inferInsert;
