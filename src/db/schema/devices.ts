import { pgTable, text, timestamp, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const deviceTypeEnum = pgEnum("device_type", ["desktop", "xr", "mobile", "web"]);
export const devicePlatformEnum = pgEnum("device_platform", ["windows", "macos", "linux", "ios", "android", "quest", "visionpro", "web"]);

export const devices = pgTable("devices", {
  id: text("id").primaryKey(), // Device ID sent from client
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  deviceType: deviceTypeEnum("device_type").default("desktop"),
  platform: devicePlatformEnum("platform"),
  appVersion: text("app_version"),
  osVersion: text("os_version"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type DeviceType = "desktop" | "xr" | "mobile" | "web";
export type DevicePlatform = "windows" | "macos" | "linux" | "ios" | "android" | "quest" | "visionpro" | "web";
