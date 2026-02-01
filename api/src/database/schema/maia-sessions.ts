import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

/**
 * MAIA Sessions Table
 * Tracks sessions initiated from Unity app
 */
export const maiaSessions = pgTable("maia_sessions", {
  // Primary key - our backend's session ID
  id: text("id").primaryKey(),

  // User who started the session
  userId: text("user_id")
    .notNull()
    .references(() => users.id),

  // Provider's session ID (e.g., Gemini's session ID)
  providerSessionId: text("provider_session_id").notNull(),

  // Session timestamps
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),

  // Session status
  isActive: boolean("is_active").default(true).notNull(),

  // Aggregated token counts (updated as turns are added)
  totalInputTextTokens: integer("total_input_text_tokens").default(0).notNull(),
  totalInputImageTokens: integer("total_input_image_tokens")
    .default(0)
    .notNull(),
  totalInputAudioTokens: integer("total_input_audio_tokens")
    .default(0)
    .notNull(),
  totalInputTextCachedTokens: integer("total_input_text_cached_tokens")
    .default(0)
    .notNull(),
  totalInputImageCachedTokens: integer("total_input_image_cached_tokens")
    .default(0)
    .notNull(),
  totalInputAudioCachedTokens: integer("total_input_audio_cached_tokens")
    .default(0)
    .notNull(),
  totalOutputTextTokens: integer("total_output_text_tokens")
    .default(0)
    .notNull(),
  totalOutputImageTokens: integer("total_output_image_tokens")
    .default(0)
    .notNull(),
  totalOutputAudioTokens: integer("total_output_audio_tokens")
    .default(0)
    .notNull(),
  totalOutputReasoningTokens: integer("total_output_reasoning_tokens")
    .default(0)
    .notNull(),

  // Metadata
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

/**
 * MAIA Session Turns Table
 * Tracks individual turns (request/response pairs) within a session
 */
export const maiaSessionTurns = pgTable("maia_session_turns", {
  id: text("id").primaryKey(),

  // Parent session
  sessionId: text("session_id")
    .notNull()
    .references(() => maiaSessions.id, { onDelete: "cascade" }),

  // Turn timestamps
  requestTime: timestamp("request_time", { withTimezone: true }).notNull(),
  responseTime: timestamp("response_time", { withTimezone: true }).notNull(),

  // Input token usage by modality
  inputTextTokens: integer("input_text_tokens").default(0).notNull(),
  inputImageTokens: integer("input_image_tokens").default(0).notNull(),
  inputAudioTokens: integer("input_audio_tokens").default(0).notNull(),

  // Cached input tokens
  inputTextCachedTokens: integer("input_text_cached_tokens")
    .default(0)
    .notNull(),
  inputImageCachedTokens: integer("input_image_cached_tokens")
    .default(0)
    .notNull(),
  inputAudioCachedTokens: integer("input_audio_cached_tokens")
    .default(0)
    .notNull(),

  // Output token usage by modality
  outputTextTokens: integer("output_text_tokens").default(0).notNull(),
  outputImageTokens: integer("output_image_tokens").default(0).notNull(),
  outputAudioTokens: integer("output_audio_tokens").default(0).notNull(),
  outputReasoningTokens: integer("output_reasoning_tokens")
    .default(0)
    .notNull(),

  // Metadata
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Relations
export const maiaSessionsRelations = relations(
  maiaSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [maiaSessions.userId],
      references: [users.id],
    }),
    turns: many(maiaSessionTurns),
  }),
);

export const maiaSessionTurnsRelations = relations(
  maiaSessionTurns,
  ({ one }) => ({
    session: one(maiaSessions, {
      fields: [maiaSessionTurns.sessionId],
      references: [maiaSessions.id],
    }),
  }),
);

// Types
export type MaiaSession = typeof maiaSessions.$inferSelect;
export type NewMaiaSession = typeof maiaSessions.$inferInsert;
export type MaiaSessionTurn = typeof maiaSessionTurns.$inferSelect;
export type NewMaiaSessionTurn = typeof maiaSessionTurns.$inferInsert;
