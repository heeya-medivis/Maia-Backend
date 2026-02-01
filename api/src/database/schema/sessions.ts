import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { devices } from "./devices";
import { authProtocolEnum } from "./auth-connections";

/**
 * Sessions table - JWT session tokens for authenticated devices
 * Uses refresh token rotation with family-based theft detection
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // nanoid - session token ID
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: text("device_id").references(() => devices.id, {
      onDelete: "cascade",
    }),

    // Refresh token (hashed for security)
    refreshTokenHash: text("refresh_token_hash").notNull(),

    // Token family for rotation detection (detects token reuse attacks)
    refreshTokenFamilyId: text("refresh_token_family_id").notNull(),

    // Auth context - how the user authenticated
    authMethod: authProtocolEnum("auth_method").notNull(),

    // Lifecycle
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"), // 'logout', 'admin_revoke', 'rotation_reuse', 'expired'
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Request metadata
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_device_idx").on(table.deviceId),
    index("sessions_refresh_token_hash_idx").on(table.refreshTokenHash),
    index("sessions_family_id_idx").on(table.refreshTokenFamilyId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
