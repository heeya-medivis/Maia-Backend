import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Audit action enum
 */
export const auditActionEnum = pgEnum('audit_action', [
  'user.login',
  'user.logout',
  'user.created',
  'user.updated',
  'user.deleted',
  'device.registered',
  'device.revoked',
  'ai.request',
  'admin.action',
]);

/**
 * Audit Logs table
 * Security and compliance logging
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(), // nanoid
    action: auditActionEnum('action').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    targetType: text('target_type'), // e.g., "user", "device"
    targetId: text('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdDateTime: timestamp('created_date_time', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_user_idx').on(table.userId),
    index('audit_logs_target_idx').on(table.targetType, table.targetId),
    index('audit_logs_created_idx').on(table.createdDateTime),
  ],
);

/**
 * Usage Events table
 * Telemetry and analytics events
 */
export const usageEvents = pgTable(
  'usage_events',
  {
    id: text('id').primaryKey(), // nanoid
    eventType: text('event_type').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    deviceId: text('device_id'),
    sessionId: text('session_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdDateTime: timestamp('created_date_time', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('usage_events_type_idx').on(table.eventType),
    index('usage_events_user_idx').on(table.userId),
    index('usage_events_created_idx').on(table.createdDateTime),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'device.registered'
  | 'device.revoked'
  | 'ai.request'
  | 'admin.action';

export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
