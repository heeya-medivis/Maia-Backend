import { pgTable, text, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const auditActionEnum = pgEnum("audit_action", [
  "user.login",
  "user.logout",
  "user.created",
  "user.updated",
  "user.deleted",
  "org.created",
  "org.updated",
  "org.deleted",
  "org.member_added",
  "org.member_removed",
  "device.registered",
  "device.revoked",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "credits.granted",
  "credits.consumed",
  "credits.purchased",
  "ai.request",
  "admin.action",
]);

// Audit logs for security and compliance
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(), // nanoid
    action: auditActionEnum("action").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    targetType: text("target_type"), // e.g., "user", "device", "subscription"
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_org_idx").on(table.organizationId),
    index("audit_logs_target_idx").on(table.targetType, table.targetId),
    index("audit_logs_created_idx").on(table.createdAt),
  ]
);

// Usage events for telemetry and analytics
export const usageEvents = pgTable(
  "usage_events",
  {
    id: text("id").primaryKey(), // nanoid
    eventType: text("event_type").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    deviceId: text("device_id"),
    sessionId: text("session_id"),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("usage_events_type_idx").on(table.eventType),
    index("usage_events_user_idx").on(table.userId),
    index("usage_events_org_idx").on(table.organizationId),
    index("usage_events_device_idx").on(table.deviceId),
    index("usage_events_created_idx").on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = typeof auditActionEnum.enumValues[number];

export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
