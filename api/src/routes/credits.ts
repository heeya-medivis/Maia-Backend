import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, requireOrgMiddleware } from "../middleware/auth.js";
import { getBalance, getCreditHistory } from "../services/credits/ledger.js";
import { BadRequestError } from "../middleware/error.js";

const credits = new Hono();

// All routes require auth and org membership
credits.use("*", authMiddleware, requireOrgMiddleware);

// GET /credits - Get current balance
credits.get("/", async (c) => {
  const authUser = c.get("user");

  if (!authUser.organizationId) {
    throw new BadRequestError("Organization required", "ORG_REQUIRED");
  }

  const balance = await getBalance(authUser.organizationId);

  return c.json({
    balance: {
      granted: balance.granted,
      purchased: balance.purchased,
      total: balance.total,
    },
    organizationId: authUser.organizationId,
  });
});

// Query schema for history
const historyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

// GET /credits/history - Get credit transaction history
credits.get("/history", zValidator("query", historyQuerySchema), async (c) => {
  const authUser = c.get("user");
  const { limit, offset } = c.req.valid("query");

  if (!authUser.organizationId) {
    throw new BadRequestError("Organization required", "ORG_REQUIRED");
  }

  const operations = await getCreditHistory(authUser.organizationId, limit, offset);

  return c.json({
    operations: operations.map((op) => ({
      id: op.id,
      type: op.operationType,
      amount: op.amount,
      description: op.description,
      createdAt: op.createdAt.toISOString(),
    })),
    pagination: {
      limit,
      offset,
      hasMore: operations.length === limit,
    },
  });
});

export default credits;
