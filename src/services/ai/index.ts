import { nanoid } from "nanoid";
import { db } from "../../db/index.js";
import {
  aiRequests,
  conversations,
  messages,
  AiProvider,
} from "../../db/schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import { env } from "../../config/env.js";
import { consumeCredits } from "../credits/ledger.js";
import { BadRequestError, ForbiddenError } from "../../middleware/error.js";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendMessageParams {
  userId: string;
  organizationId: string;
  conversationId?: string;
  message: string;
  provider?: AiProvider;
  model?: string;
}

export interface SendMessageResult {
  conversationId: string;
  messageId: string;
  response: string;
  creditsConsumed: number;
}

// Default models per provider
const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o",
  anthropic: "claude-3-5-sonnet-20241022",
  google: "gemini-1.5-pro",
};

// Credit cost per request (can be refined based on tokens later)
const CREDITS_PER_REQUEST = 1;

export async function sendMessage(
  params: SendMessageParams
): Promise<SendMessageResult> {
  const {
    userId,
    organizationId,
    message,
    provider = "google",
    model = DEFAULT_MODELS[provider],
  } = params;
  let { conversationId } = params;

  // Consume credits first (fail fast if insufficient)
  const idempotencyKey = `ai_${nanoid()}`;
  await consumeCredits({
    organizationId,
    amount: CREDITS_PER_REQUEST,
    idempotencyKey,
    description: `AI request: ${provider}/${model}`,
    userId,
  });

  // Get or create conversation
  if (!conversationId) {
    conversationId = nanoid();
    await db.insert(conversations).values({
      id: conversationId,
      userId,
      organizationId,
      title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
    });
  }

  // Get conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  const chatHistory: ChatMessage[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add new user message
  const userMessageId = nanoid();
  await db.insert(messages).values({
    id: userMessageId,
    conversationId,
    role: "user",
    content: message,
  });

  chatHistory.push({ role: "user", content: message });

  // Create AI request record
  const aiRequestId = nanoid();
  const startTime = Date.now();

  let response: string;
  let inputTokens = 0;
  let outputTokens = 0;
  let success = true;
  let errorMessage: string | undefined;

  try {
    // Call AI provider
    const result = await callAiProvider(provider, model, chatHistory);
    response = result.content;
    inputTokens = result.inputTokens ?? 0;
    outputTokens = result.outputTokens ?? 0;
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : "Unknown error";
    response = "I apologize, but I encountered an error processing your request.";
  }

  const durationMs = Date.now() - startTime;

  // Store AI request
  await db.insert(aiRequests).values({
    id: aiRequestId,
    userId,
    organizationId,
    conversationId,
    provider,
    model,
    inputTokens,
    outputTokens,
    creditsConsumed: CREDITS_PER_REQUEST,
    durationMs,
    success,
    errorMessage,
  });

  // Store assistant message
  const assistantMessageId = nanoid();
  await db.insert(messages).values({
    id: assistantMessageId,
    conversationId,
    role: "assistant",
    content: response,
    aiRequestId,
  });

  // Update conversation title if first message
  if (history.length === 0) {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  return {
    conversationId,
    messageId: assistantMessageId,
    response,
    creditsConsumed: CREDITS_PER_REQUEST,
  };
}

interface AiResponse {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
}

// Type definitions for AI provider responses
interface GoogleAiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

interface OpenAiResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

interface AnthropicResponse {
  content?: Array<{
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

async function callAiProvider(
  provider: AiProvider,
  model: string,
  messages: ChatMessage[]
): Promise<AiResponse> {
  switch (provider) {
    case "google":
      return callGoogleAi(model, messages);
    case "openai":
      return callOpenAi(model, messages);
    case "anthropic":
      return callAnthropic(model, messages);
    default:
      throw new BadRequestError(`Unsupported provider: ${provider}`, "INVALID_PROVIDER");
  }
}

async function callGoogleAi(model: string, messages: ChatMessage[]): Promise<AiResponse> {
  if (!env.GOOGLE_AI_API_KEY) {
    throw new BadRequestError("Google AI not configured", "PROVIDER_NOT_CONFIGURED");
  }

  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const contents = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMessage
          ? { parts: [{ text: systemMessage.content }] }
          : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google AI error: ${error}`);
  }

  const data = (await response.json()) as GoogleAiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return {
    content,
    inputTokens: data.usageMetadata?.promptTokenCount,
    outputTokens: data.usageMetadata?.candidatesTokenCount,
  };
}

async function callOpenAi(model: string, messages: ChatMessage[]): Promise<AiResponse> {
  if (!env.OPENAI_API_KEY) {
    throw new BadRequestError("OpenAI not configured", "PROVIDER_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${error}`);
  }

  const data = (await response.json()) as OpenAiResponse;
  const content = data.choices?.[0]?.message?.content ?? "";

  return {
    content,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  };
}

async function callAnthropic(model: string, messages: ChatMessage[]): Promise<AiResponse> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new BadRequestError("Anthropic not configured", "PROVIDER_NOT_CONFIGURED");
  }

  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemMessage?.content,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${error}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const content = data.content?.[0]?.text ?? "";

  return {
    content,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  };
}

// Get user's conversations
export async function getConversations(
  userId: string,
  organizationId: string,
  limit = 50,
  offset = 0
) {
  const result = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      status: conversations.status,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.organizationId, organizationId),
        eq(conversations.status, "active")
      )
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
    .offset(offset);

  return result;
}

// Get conversation messages
export async function getConversationMessages(
  conversationId: string,
  userId: string,
  limit = 100,
  offset = 0
) {
  // Verify conversation belongs to user
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  if (!conversation) {
    throw new ForbiddenError("Conversation not found or access denied", "CONVERSATION_NOT_FOUND");
  }

  const result = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(limit)
    .offset(offset);

  return result;
}

// Delete (archive) conversation
export async function archiveConversation(conversationId: string, userId: string) {
  // Verify conversation belongs to user
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      )
    )
    .limit(1);

  if (!conversation) {
    throw new ForbiddenError("Conversation not found or access denied", "CONVERSATION_NOT_FOUND");
  }

  await db
    .update(conversations)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}
