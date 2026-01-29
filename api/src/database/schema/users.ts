import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Users table - Converted from C# ApplicationUser : IdentityUser
 * Maps to: SurgicalAR.Web.Areas.Identity.Models.ApplicationUser
 * Extended with Clerk fields for profile data
 */
export const users = pgTable(
  'users',
  {
    // Primary key (was inherited from IdentityUser.Id)
    id: text('id').primaryKey(),

    // Email (from IdentityUser.Email + UserName)
    email: text('email').notNull().unique(),

    // Custom fields from ApplicationUser
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),

    // Organization and role (null for users who sign up without an org)
    organization: text('organization'),
    role: text('role'),

    // Admin flag - platform-level admin access
    // Only Maia company employees should have this
    isAdmin: boolean('is_admin').default(false).notNull(),

    // Tracking fields - separate login timestamps for web and app
    lastLoginWeb: timestamp('last_login_web', { withTimezone: true }),
    lastLoginApp: timestamp('last_login_app', { withTimezone: true }),

    // Timestamps
    createdDateTime: timestamp('created_date_time', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // Soft delete
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('users_email_idx').on(table.email),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
