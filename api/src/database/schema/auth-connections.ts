import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Auth protocol enum - used for sessions and authorization codes
// Tracks HOW the user authenticated (which protocol/method)
export const authProtocolEnum = pgEnum('auth_protocol', [
  'workos_sso',           // Enterprise SSO via WorkOS (SAML/OIDC)
  'workos_oidc_google',   // Google via WorkOS OIDC connection
  'workos_oidc_microsoft', // Microsoft via WorkOS OIDC connection
  'workos_oidc_apple',    // Apple via WorkOS OIDC connection
  'workos_magic_link',    // Magic link (passwordless) via WorkOS
]);

// Auth connection config type for OIDC connections
export interface AuthConnectionConfig {
  issuer?: string;
  clientId?: string;
  clientSecretEnc?: string;  // Encrypted client secret
  scopes?: string[];
  additionalParams?: Record<string, string>;
}

// Auth connections table - tenant-specific auth configuration
// Maps to WorkOS connections for enterprise SSO or direct OIDC
export const authConnections = pgTable(
  'auth_connections',
  {
    id: text('id').primaryKey(), // nanoid

    // WorkOS connection ID (for SSO connections via WorkOS)
    workosConnectionId: text('workos_connection_id'),

    // Connection protocol (matches authProtocolEnum values)
    protocol: authProtocolEnum('protocol').notNull(),

    // OIDC configuration (for direct provider connections)
    config: jsonb('config').$type<AuthConnectionConfig>().default({}),

    // Display name (e.g., "Google", "Microsoft", "Okta SSO")
    name: text('name').notNull(),

    // Whether this connection is enabled
    enabled: boolean('enabled').notNull().default(true),

    // Whether this is the default connection
    isDefault: boolean('is_default').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('auth_connections_workos_conn_idx').on(table.workosConnectionId),
    index('auth_connections_protocol_idx').on(table.protocol),
  ],
);

// Type exports
export type AuthConnection = typeof authConnections.$inferSelect;
export type NewAuthConnection = typeof authConnections.$inferInsert;
export type AuthProtocol = (typeof authProtocolEnum.enumValues)[number];
