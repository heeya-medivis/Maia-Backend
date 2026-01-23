import { pgTable, text, timestamp, boolean, integer, index, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { users } from "./users.js";

// Feature flags for entitlement overrides
// Resolution order: user > org > tier defaults
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: text("id").primaryKey(), // nanoid
    featureKey: text("feature_key").notNull(), // e.g., "maia_access", "max_devices", "monthly_credits"
    // Either org or user scope (not both)
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    // Value fields (only one should be set)
    enabled: boolean("enabled"),
    valueInt: integer("value_int"),
    valueText: text("value_text"),
    // Metadata
    reason: text("reason"), // Why this override exists
    expiresAt: timestamp("expires_at", { withTimezone: true }), // Optional expiration
    createdBy: text("created_by"), // Admin who set this
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Ensure unique flag per scope
    unique("feature_flags_org_unique").on(table.organizationId, table.featureKey),
    unique("feature_flags_user_unique").on(table.userId, table.featureKey),
    index("feature_flags_org_idx").on(table.organizationId),
    index("feature_flags_user_idx").on(table.userId),
    index("feature_flags_key_idx").on(table.featureKey),
  ]
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;

// Standard feature keys
export const FEATURE_KEYS = {
  MAIA_ACCESS: "maia_access",
  MAX_DEVICES: "max_devices",
  MONTHLY_CREDITS: "monthly_credits",
  MAX_CONVERSATIONS: "max_conversations",
  PRIORITY_SUPPORT: "priority_support",
  ADVANCED_ANALYTICS: "advanced_analytics",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
