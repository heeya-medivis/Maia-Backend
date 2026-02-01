import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Device type enum
 */
export const deviceTypeEnum = pgEnum("device_type", [
  "desktop",
  "xr",
  "mobile",
  "web",
]);

/**
 * Device platform enum
 */
export const devicePlatformEnum = pgEnum("device_platform", [
  "windows",
  "macos",
  "linux",
  "ios",
  "android",
  "quest",
  "visionpro",
  "web",
]);

/**
 * Devices table
 * Tracks all devices that have authenticated with the system
 */
export const devices = pgTable(
  "devices",
  {
    id: text("id").primaryKey(), // Device ID from client
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name"),
    deviceType: deviceTypeEnum("device_type").default("desktop"),
    platform: devicePlatformEnum("platform"),
    appVersion: text("app_version"),
    osVersion: text("os_version"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    lastActiveAt: timestamp("last_active_at", {
      withTimezone: true,
    }).defaultNow(),
    isActive: boolean("is_active").default(true).notNull(),

    // Timestamps
    createdDateTime: timestamp("created_date_time", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("devices_user_idx").on(table.userId),
    index("devices_active_idx").on(table.isActive),
  ],
);

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type DeviceType = "desktop" | "xr" | "mobile" | "web";
export type DevicePlatform =
  | "windows"
  | "macos"
  | "linux"
  | "ios"
  | "android"
  | "quest"
  | "visionpro"
  | "web";
