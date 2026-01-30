import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * MAIA Chat Sessions Table
 * Tracks chat sessions initiated from Unity app
 */
export const maiaChatSessions = pgTable('maia_chat_sessions', {
  // Primary key - our backend's session ID
  id: text('id').primaryKey(),

  // User who started the session
  userId: text('user_id')
    .notNull()
    .references(() => users.id),

  // Provider's session ID (e.g., Gemini's session ID)
  providerSessionId: text('provider_session_id').notNull(),

  // Session timestamps
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),

  // Session status
  isActive: boolean('is_active').default(true).notNull(),

  // Aggregated token counts (updated as turns are added)
  totalInputTextTokens: integer('total_input_text_tokens').default(0).notNull(),
  totalInputImageTokens: integer('total_input_image_tokens').default(0).notNull(),
  totalInputAudioTokens: integer('total_input_audio_tokens').default(0).notNull(),
  totalOutputTextTokens: integer('total_output_text_tokens').default(0).notNull(),
  totalOutputAudioTokens: integer('total_output_audio_tokens').default(0).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

/**
 * MAIA Chat Turns Table
 * Tracks individual turns (request/response pairs) within a session
 */
export const maiaChatTurns = pgTable('maia_chat_turns', {
  id: text('id').primaryKey(),

  // Parent session
  sessionId: text('session_id')
    .notNull()
    .references(() => maiaChatSessions.id, { onDelete: 'cascade' }),

  // Turn timestamps
  requestTime: timestamp('request_time', { withTimezone: true }).notNull(),
  responseTime: timestamp('response_time', { withTimezone: true }).notNull(),

  // Token usage by modality
  inputTextTokens: integer('input_text_tokens').default(0).notNull(),
  inputImageTokens: integer('input_image_tokens').default(0).notNull(),
  inputAudioTokens: integer('input_audio_tokens').default(0).notNull(),
  outputTextTokens: integer('output_text_tokens').default(0).notNull(),
  outputAudioTokens: integer('output_audio_tokens').default(0).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const maiaChatSessionsRelations = relations(maiaChatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [maiaChatSessions.userId],
    references: [users.id],
  }),
  turns: many(maiaChatTurns),
}));

export const maiaChatTurnsRelations = relations(maiaChatTurns, ({ one }) => ({
  session: one(maiaChatSessions, {
    fields: [maiaChatTurns.sessionId],
    references: [maiaChatSessions.id],
  }),
}));

/**
 * MAIA Deep Analysis Table
 * Tracks deep analysis requests (separate from chat sessions)
 */
export const maiaDeepAnalysis = pgTable('maia_deep_analysis', {
  id: text('id').primaryKey(),

  // User who created the analysis
  userId: text('user_id')
    .notNull()
    .references(() => users.id),

  // Timestamps
  requestTime: timestamp('request_time', { withTimezone: true }).notNull(),

  // Token counts
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Deep Analysis Relations
export const maiaDeepAnalysisRelations = relations(maiaDeepAnalysis, ({ one }) => ({
  user: one(users, {
    fields: [maiaDeepAnalysis.userId],
    references: [users.id],
  }),
}));

// Types
export type MaiaChatSession = typeof maiaChatSessions.$inferSelect;
export type NewMaiaChatSession = typeof maiaChatSessions.$inferInsert;
export type MaiaChatTurn = typeof maiaChatTurns.$inferSelect;
export type NewMaiaChatTurn = typeof maiaChatTurns.$inferInsert;
export type MaiaDeepAnalysis = typeof maiaDeepAnalysis.$inferSelect;
export type NewMaiaDeepAnalysis = typeof maiaDeepAnalysis.$inferInsert;
