import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { maiaModels } from "./maia-models";

/**
 * Host Provider enum
 * Converted from C# HostProvider enum
 */
export const hostProviderEnum = pgEnum("host_provider", ["invalid", "aws_ec2"]);

/**
 * MAIA Hosts table
 * Converted from C# MAIAHost
 * Maps to: SurgicalAR.Web.Models.MAIAHost
 */
export const maiaHosts = pgTable(
  "maia_hosts",
  {
    id: text("id").primaryKey(),

    // Host configuration
    hostProvider: hostProviderEnum("host_provider").notNull(),
    serverIp: text("server_ip").notNull(),

    // Link to model (MAIAModelId in C#)
    maiaModelId: text("maia_model_id")
      .notNull()
      .references(() => maiaModels.id, { onDelete: "cascade" }),

    // Audit fields (matching C# pattern exactly)
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdDateTime: timestamp("created_date_time", { withTimezone: true })
      .defaultNow()
      .notNull(),
    modifiedById: text("modified_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    modifiedDateTime: timestamp("modified_date_time", { withTimezone: true }),

    // Soft delete (matching C# IsDeleted pattern)
    isDeleted: boolean("is_deleted").default(false).notNull(),
    deletedDateTime: timestamp("deleted_date_time", { withTimezone: true }),
    deletedById: text("deleted_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("maia_hosts_provider_idx").on(table.hostProvider),
    index("maia_hosts_model_idx").on(table.maiaModelId),
  ],
);

export type MaiaHost = typeof maiaHosts.$inferSelect;
export type NewMaiaHost = typeof maiaHosts.$inferInsert;
export type HostProvider = "invalid" | "aws_ec2";
