import { pgTable, text, timestamp, pgEnum, integer, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const aiProviderEnum = pgEnum("ai_provider", ["openai", "anthropic", "google"]);
export const conversationStatusEnum = pgEnum("conversation_status", ["active", "archived", "deleted"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

// AI request logging for usage tracking and debugging
export const aiRequests = pgTable(
  "ai_requests",
  {
    id: text("id").primaryKey(), // nanoid
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id"),
    provider: aiProviderEnum("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    creditsConsumed: integer("credits_consumed").notNull().default(1),
    durationMs: integer("duration_ms"),
    success: boolean("success").default(true),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ai_requests_user_idx").on(table.userId),
    index("ai_requests_org_idx").on(table.organizationId),
    index("ai_requests_conversation_idx").on(table.conversationId),
    index("ai_requests_created_idx").on(table.createdAt),
  ]
);

// Conversation threads
export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(), // nanoid
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title"),
    status: conversationStatusEnum("status").default("active").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("conversations_user_idx").on(table.userId),
    index("conversations_org_idx").on(table.organizationId),
    index("conversations_status_idx").on(table.status),
  ]
);

// Chat messages
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(), // nanoid
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    aiRequestId: text("ai_request_id").references(() => aiRequests.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId),
    index("messages_created_idx").on(table.createdAt),
  ]
);

export type AiRequest = typeof aiRequests.$inferSelect;
export type NewAiRequest = typeof aiRequests.$inferInsert;
export type AiProvider = "openai" | "anthropic" | "google";

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ConversationStatus = "active" | "archived" | "deleted";

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type MessageRole = "user" | "assistant" | "system";
