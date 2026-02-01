import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Identity provider enum - WorkOS prefixed
// All authentication flows route through WorkOS
export const identityProviderEnum = pgEnum("identity_provider", [
  "workos_sso", // Enterprise SSO via WorkOS (SAML/OIDC)
  "workos_oidc_google", // Google via WorkOS OIDC connection
  "workos_oidc_microsoft", // Microsoft via WorkOS OIDC connection
  "workos_oidc_apple", // Apple via WorkOS OIDC connection
  "workos_magic_link", // Magic link (passwordless) via WorkOS
]);

// Identities table - links users to external auth providers via WorkOS
export const identities = pgTable(
  "identities",
  {
    id: text("id").primaryKey(), // nanoid

    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // WorkOS identity provider
    provider: identityProviderEnum("provider").notNull(),

    // WorkOS subject identifier (idp_id from WorkOS profile)
    providerSubject: text("provider_subject").notNull(),

    // Provider data
    email: text("email"),

    // Raw attributes from WorkOS profile
    rawAttributes: jsonb("raw_attributes")
      .notNull()
      .$type<Record<string, unknown>>()
      .default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("identities_user_id_idx").on(table.userId),
    uniqueIndex("identities_provider_subject_uniq").on(
      table.provider,
      table.providerSubject,
    ),
    index("identities_email_idx").on(table.email),
  ],
);

// Type exports
export type Identity = typeof identities.$inferSelect;
export type NewIdentity = typeof identities.$inferInsert;
export type IdentityProvider = (typeof identityProviderEnum.enumValues)[number];
