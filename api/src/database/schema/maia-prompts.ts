import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { maiaModels } from './maia-models';

/**
 * Prompt Type enum
 * Converted from C# PromptType enum
 */
export const promptTypeEnum = pgEnum('prompt_type', [
  'invalid',
  'system_prompt',
  'analysis_prompt',
]);

/**
 * MAIA Prompts table
 * Converted from C# MAIAPrompt
 * Maps to: SurgicalAR.Web.Models.MAIAPrompt
 */
export const maiaPrompts = pgTable(
  'maia_prompts',
  {
    id: text('id').primaryKey(),

    // Prompt configuration
    type: promptTypeEnum('type').notNull(),
    content: text('content').notNull(),

    // Link to model (MAIAModelId in C#)
    maiaModelId: text('maia_model_id')
      .notNull()
      .references(() => maiaModels.id, { onDelete: 'cascade' }),

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
    index('maia_prompts_model_idx').on(table.maiaModelId),
    index('maia_prompts_type_idx').on(table.type),
    index('maia_prompts_active_idx').on(table.isActive),
  ],
);

export type MaiaPrompt = typeof maiaPrompts.$inferSelect;
export type NewMaiaPrompt = typeof maiaPrompts.$inferInsert;
export type PromptType = 'invalid' | 'system_prompt' | 'analysis_prompt';
