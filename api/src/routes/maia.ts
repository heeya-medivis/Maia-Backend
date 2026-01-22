import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireOrgMiddleware } from "../middleware/auth.js";
import {
  sendMessage,
  getConversations,
  getConversationMessages,
  archiveConversation,
} from "../services/ai/index.js";
import { hasFeatureAccess } from "../services/entitlements/index.js";
import { FEATURE_KEYS } from "../db/schema/index.js";
import { ForbiddenError, BadRequestError } from "../middleware/error.js";

const maia = new Hono();

// All routes require auth and org membership
maia.use("*", authMiddleware, requireOrgMiddleware);

// Check Maia access middleware
maia.use("*", async (c, next) => {
  const authUser = c.get("user");

  if (!authUser.organizationId) {
    throw new BadRequestError("Organization required", "ORG_REQUIRED");
  }

  const hasAccess = await hasFeatureAccess(
    authUser.id,
    authUser.organizationId,
    FEATURE_KEYS.MAIA_ACCESS
  );

  if (!hasAccess) {
    throw new ForbiddenError("Maia access not enabled for your account", "MAIA_ACCESS_DENIED");
  }

  await next();
});

// Schema for chat message
const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  provider: z.enum(["openai", "anthropic", "google"]).optional(),
  model: z.string().optional(),
});

// POST /maia/chat - Send a message to Maia
maia.post("/chat", zValidator("json", chatSchema), async (c) => {
  const authUser = c.get("user");
  const { message, conversationId, provider, model } = c.req.valid("json");

  if (!authUser.organizationId) {
    throw new BadRequestError("Organization required", "ORG_REQUIRED");
  }

  const result = await sendMessage({
    userId: authUser.id,
    organizationId: authUser.organizationId,
    message,
    conversationId,
    provider,
    model,
  });

  return c.json({
    success: true,
    conversationId: result.conversationId,
    messageId: result.messageId,
    response: result.response,
    creditsConsumed: result.creditsConsumed,
  });
});

// Query schema for conversations
const conversationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /maia/conversations - List user's conversations
maia.get("/conversations", zValidator("query", conversationsQuerySchema), async (c) => {
  const authUser = c.get("user");
  const { limit, offset } = c.req.valid("query");

  if (!authUser.organizationId) {
    throw new BadRequestError("Organization required", "ORG_REQUIRED");
  }

  const conversations = await getConversations(
    authUser.id,
    authUser.organizationId,
    limit,
    offset
  );

  return c.json({
    conversations: conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      status: conv.status,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    })),
    pagination: {
      limit,
      offset,
      hasMore: conversations.length === limit,
    },
  });
});

// Query schema for messages
const messagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// GET /maia/conversations/:id/messages - Get conversation messages
maia.get(
  "/conversations/:id/messages",
  zValidator("query", messagesQuerySchema),
  async (c) => {
    const authUser = c.get("user");
    const conversationId = c.req.param("id");
    const { limit, offset } = c.req.valid("query");

    const messages = await getConversationMessages(
      conversationId,
      authUser.id,
      limit,
      offset
    );

    return c.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
      pagination: {
        limit,
        offset,
        hasMore: messages.length === limit,
      },
    });
  }
);

// DELETE /maia/conversations/:id - Archive a conversation
maia.delete("/conversations/:id", async (c) => {
  const authUser = c.get("user");
  const conversationId = c.req.param("id");

  await archiveConversation(conversationId, authUser.id);

  return c.json({
    success: true,
    message: "Conversation archived",
  });
});

export default maia;
