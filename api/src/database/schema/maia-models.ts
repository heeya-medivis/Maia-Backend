import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  real,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Model Category enum
 * Converted from C# ModelCategory enum
 */
export const modelCategoryEnum = pgEnum('model_category', [
  'balanced',
  'thinking',
  'live',
]);

/**
 * AI Provider enum
 * Converted from C# Provider enum
 */
export const providerEnum = pgEnum('provider', [
  'invalid',
  'gcloud',
  'openai',
  'self',
]);

/**
 * MAIA Models table
 * Converted from C# MAIAModel
 * Maps to: SurgicalAR.Web.Models.MAIAModel
 */
export const maiaModels = pgTable(
  'maia_models',
  {
    id: text('id').primaryKey(),

    // Model identification
    modelName: text('model_name').notNull(), // Internal name (e.g., "gpt-4o")
    modelDisplayName: text('model_display_name').notNull(), // Display name (e.g., "GPT-4 Omni")

    // Classification
    modelCategory: modelCategoryEnum('model_category').notNull(),
    provider: providerEnum('provider').notNull(),

    // Configuration
    modelPriority: integer('model_priority'), // For ordering/selection
    pricing: real('pricing').default(0).notNull(), // Cost per request/token

    // Status
    isActive: boolean('is_active').default(false).notNull(),

    // Audit fields (matching C# pattern exactly)
    createdById: text('created_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdDateTime: timestamp('created_date_time', { withTimezone: true })
      .defaultNow()
      .notNull(),
    modifiedById: text('modified_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    modifiedDateTime: timestamp('modified_date_time', { withTimezone: true }),

    // Soft delete (matching C# IsDeleted pattern)
    isDeleted: boolean('is_deleted').default(false).notNull(),
    deletedDateTime: timestamp('deleted_date_time', { withTimezone: true }),
    deletedById: text('deleted_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    index('maia_models_provider_idx').on(table.provider),
    index('maia_models_category_idx').on(table.modelCategory),
    index('maia_models_active_idx').on(table.isActive),
    index('maia_models_priority_idx').on(table.modelPriority),
  ],
);

export type MaiaModel = typeof maiaModels.$inferSelect;
export type NewMaiaModel = typeof maiaModels.$inferInsert;
export type ModelCategory = 'balanced' | 'thinking' | 'live';
export type Provider = 'invalid' | 'gcloud' | 'openai' | 'self';
