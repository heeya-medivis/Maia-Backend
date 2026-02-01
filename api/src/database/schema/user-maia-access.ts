import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { maiaModels } from "./maia-models";

/**
 * User MAIA Access table
 * Converted from C# UserMAIAAccess
 * Maps to: SurgicalAR.Web.Models.UserMAIAAccess
 *
 * This table controls which users have access to which AI models
 */
export const userMaiaAccess = pgTable(
  "user_maia_access",
  {
    id: text("id").primaryKey(),

    // User reference (UserId in C#)
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Model reference (MAIAModelId in C#)
    maiaModelId: text("maia_model_id")
      .notNull()
      .references(() => maiaModels.id, { onDelete: "cascade" }),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Audit fields (matching C# pattern exactly)
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdDateTime: timestamp("created_date_time", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedById: text("updated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updateDateTime: timestamp("update_date_time", { withTimezone: true }),
  },
  (table) => [
    // Ensure unique user-model combination
    unique("user_maia_access_user_model_unique").on(
      table.userId,
      table.maiaModelId,
    ),
    index("user_maia_access_user_idx").on(table.userId),
    index("user_maia_access_model_idx").on(table.maiaModelId),
    index("user_maia_access_active_idx").on(table.isActive),
  ],
);

export type UserMaiaAccess = typeof userMaiaAccess.$inferSelect;
export type NewUserMaiaAccess = typeof userMaiaAccess.$inferInsert;
