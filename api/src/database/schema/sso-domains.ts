import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { authConnections } from './auth-connections';

/**
 * SSO Domains Table
 * 
 * Maps email domains (e.g., @nyu.edu, @mit.edu) to SSO connections.
 * When a user attempts to log in with an enterprise email,
 * we look up their domain to find the appropriate SSO connection.
 * 
 * Example:
 *   domain: "nyu.edu"
 *   connectionId: "conn_nyu_saml_123" (links to auth_connections)
 *   
 * This allows:
 *   1. User enters email: john@nyu.edu
 *   2. System extracts domain: nyu.edu
 *   3. Looks up SSO connection for nyu.edu
 *   4. Redirects user to NYU's IdP (via WorkOS)
 */
export const ssoDomains = pgTable(
  'sso_domains',
  {
    id: text('id').primaryKey(), // nanoid

    // Email domain (without @), e.g., "nyu.edu", "stern.nyu.edu"
    domain: text('domain').notNull(),

    // Reference to the auth_connections table
    connectionId: text('connection_id')
      .notNull()
      .references(() => authConnections.id, { onDelete: 'cascade' }),

    // Whether this domain mapping is active
    enabled: boolean('enabled').notNull().default(true),

    // Optional: Organization/institution name for display
    organizationName: text('organization_name'),

    // Whether users from this domain are auto-verified
    autoVerifyEmail: boolean('auto_verify_email').notNull().default(true),

    // Optional: Only allow specific email patterns (regex)
    // e.g., "^[a-z]{2,3}[0-9]{4}@nyu\.edu$" for NetID format
    emailPattern: text('email_pattern'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Each domain should only have one active mapping
    uniqueIndex('sso_domains_domain_unique_idx').on(table.domain),
    index('sso_domains_connection_idx').on(table.connectionId),
    index('sso_domains_enabled_idx').on(table.enabled),
  ],
);

// Type exports
export type SsoDomain = typeof ssoDomains.$inferSelect;
export type NewSsoDomain = typeof ssoDomains.$inferInsert;
