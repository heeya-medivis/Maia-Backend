import { pgTable, text, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  personalOrgId: text("personal_org_id"), // Clerk org ID for personal workspace
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  index("users_personal_org_idx").on(table.personalOrgId),
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
