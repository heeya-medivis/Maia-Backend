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
    emailConfirmed: boolean('email_confirmed').default(false).notNull(),
    normalizedEmail: text('normalized_email'),

    // Password hash (from IdentityUser)
    passwordHash: text('password_hash'),

    // Phone (from IdentityUser)
    phoneNumber: text('phone_number'),
    phoneNumberConfirmed: boolean('phone_number_confirmed').default(false),

    // Two-factor auth (from IdentityUser)
    twoFactorEnabled: boolean('two_factor_enabled').default(false),

    // Lockout (from IdentityUser)
    lockoutEnd: timestamp('lockout_end', { withTimezone: true }),
    lockoutEnabled: boolean('lockout_enabled').default(true),
    accessFailedCount: text('access_failed_count').default('0'),

    // Security stamp (from IdentityUser)
    securityStamp: text('security_stamp'),
    concurrencyStamp: text('concurrency_stamp'),

    // Custom fields from ApplicationUser
    firstName: text('first_name').notNull(),
    middleName: text('middle_name'),
    lastName: text('last_name').notNull(),

    // Clerk profile field (extended from original schema)
    imageUrl: text('image_url'),

    // Tracking fields from ApplicationUser
    lastLoginDateTime: timestamp('last_login_date_time', { withTimezone: true }),
    lastVerificationEmailSentDateTime: timestamp(
      'last_verification_email_sent_date_time',
      { withTimezone: true },
    ),

    // Created by relationship
    createdById: text('created_by_id'),

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
    index('users_normalized_email_idx').on(table.normalizedEmail),
    index('users_created_by_idx').on(table.createdById),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
