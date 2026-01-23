import { pgTable, text, timestamp, pgEnum, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const memberRoleEnum = pgEnum("member_role", ["owner", "admin", "member"]);

export const orgMembers = pgTable(
  "org_members",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.organizationId] })]
);

export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;
export type MemberRole = "owner" | "admin" | "member";
