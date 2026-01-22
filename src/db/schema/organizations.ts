import { pgTable, text, timestamp, pgEnum, jsonb, integer } from "drizzle-orm/pg-core";

export const organizationTierEnum = pgEnum("organization_tier", ["free", "pro", "enterprise"]);

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(), // Clerk org ID
  name: text("name").notNull(),
  slug: text("slug").unique(),
  tier: organizationTierEnum("tier").default("free").notNull(),
  imageUrl: text("image_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  maxSeats: integer("max_seats").default(1),
  maxDevicesPerUser: integer("max_devices_per_user").default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationTier = "free" | "pro" | "enterprise";
