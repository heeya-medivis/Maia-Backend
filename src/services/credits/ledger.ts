import { nanoid } from "nanoid";
import { db } from "../../db/index.js";
import {
  creditBalances,
  creditOperations,
  creditTransactions,
} from "../../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";
import {
  BadRequestError,
  InsufficientCreditsError,
} from "../../middleware/error.js";

export interface CreditBalance {
  granted: number;
  purchased: number;
  total: number;
}

export async function getBalance(organizationId: string): Promise<CreditBalance> {
  const balances = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.organizationId, organizationId));

  const result: CreditBalance = {
    granted: 0,
    purchased: 0,
    total: 0,
  };

  for (const balance of balances) {
    if (balance.balanceType === "granted") {
      result.granted = balance.amount;
    } else if (balance.balanceType === "purchased") {
      result.purchased = balance.amount;
    }
  }

  result.total = result.granted + result.purchased;
  return result;
}

export interface ConsumeCreditsParams {
  organizationId: string;
  amount: number;
  idempotencyKey: string;
  description?: string;
  userId?: string;
  aiRequestId?: string;
}

export interface ConsumeCreditsResult {
  operationId: string;
  consumed: number;
  balanceAfter: CreditBalance;
  fromGranted: number;
  fromPurchased: number;
}

export async function consumeCredits(
  params: ConsumeCreditsParams
): Promise<ConsumeCreditsResult> {
  const { organizationId, amount, idempotencyKey, description, userId, aiRequestId } = params;

  if (amount <= 0) {
    throw new BadRequestError("Amount must be positive", "INVALID_AMOUNT");
  }

  // Check for idempotency - if operation already exists, return cached result
  const existingOperation = await db
    .select()
    .from(creditOperations)
    .where(
      and(
        eq(creditOperations.organizationId, organizationId),
        eq(creditOperations.idempotencyKey, idempotencyKey)
      )
    )
    .limit(1);

  if (existingOperation.length > 0) {
    // Return existing operation result
    const balance = await getBalance(organizationId);
    return {
      operationId: existingOperation[0].id,
      consumed: Math.abs(existingOperation[0].amount),
      balanceAfter: balance,
      fromGranted: 0, // Can't determine from stored data
      fromPurchased: 0,
    };
  }

  // Get current balances
  const balances = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.organizationId, organizationId));

  let grantedBalance = balances.find((b) => b.balanceType === "granted");
  let purchasedBalance = balances.find((b) => b.balanceType === "purchased");

  // Initialize balances if they don't exist (using onConflictDoNothing for race conditions)
  if (!grantedBalance) {
    await db
      .insert(creditBalances)
      .values({
        id: nanoid(),
        organizationId,
        balanceType: "granted",
        amount: 0,
      })
      .onConflictDoNothing();

    [grantedBalance] = await db
      .select()
      .from(creditBalances)
      .where(
        and(
          eq(creditBalances.organizationId, organizationId),
          eq(creditBalances.balanceType, "granted")
        )
      )
      .limit(1);
  }

  if (!purchasedBalance) {
    await db
      .insert(creditBalances)
      .values({
        id: nanoid(),
        organizationId,
        balanceType: "purchased",
        amount: 0,
      })
      .onConflictDoNothing();

    [purchasedBalance] = await db
      .select()
      .from(creditBalances)
      .where(
        and(
          eq(creditBalances.organizationId, organizationId),
          eq(creditBalances.balanceType, "purchased")
        )
      )
      .limit(1);
  }

  const totalAvailable = grantedBalance.amount + purchasedBalance.amount;

  if (totalAvailable < amount) {
    throw new InsufficientCreditsError(
      "Insufficient credits",
      amount,
      totalAvailable
    );
  }

  // Consume from granted first, then purchased
  let remaining = amount;
  let fromGranted = 0;
  let fromPurchased = 0;

  if (grantedBalance.amount > 0) {
    fromGranted = Math.min(grantedBalance.amount, remaining);
    remaining -= fromGranted;
  }

  if (remaining > 0) {
    fromPurchased = remaining;
  }

  // Create operation record
  const operationId = nanoid();
  await db.insert(creditOperations).values({
    id: operationId,
    organizationId,
    operationType: "consume",
    amount: -amount, // Negative for consumption
    idempotencyKey,
    description,
    userId,
    aiRequestId,
  });

  // Update balances and create transaction records
  if (fromGranted > 0) {
    const newGrantedAmount = grantedBalance.amount - fromGranted;
    await db
      .update(creditBalances)
      .set({
        amount: newGrantedAmount,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.id, grantedBalance.id));

    await db.insert(creditTransactions).values({
      id: nanoid(),
      operationId,
      balanceId: grantedBalance.id,
      amount: -fromGranted,
      balanceBefore: grantedBalance.amount,
      balanceAfter: newGrantedAmount,
    });
  }

  if (fromPurchased > 0) {
    const newPurchasedAmount = purchasedBalance.amount - fromPurchased;
    await db
      .update(creditBalances)
      .set({
        amount: newPurchasedAmount,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.id, purchasedBalance.id));

    await db.insert(creditTransactions).values({
      id: nanoid(),
      operationId,
      balanceId: purchasedBalance.id,
      amount: -fromPurchased,
      balanceBefore: purchasedBalance.amount,
      balanceAfter: newPurchasedAmount,
    });
  }

  const balanceAfter = await getBalance(organizationId);

  return {
    operationId,
    consumed: amount,
    balanceAfter,
    fromGranted,
    fromPurchased,
  };
}

export interface GrantCreditsParams {
  organizationId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  userId?: string;
}

export interface GrantCreditsResult {
  operationId: string;
  granted: number;
  balanceAfter: CreditBalance;
}

export async function grantCredits(
  params: GrantCreditsParams
): Promise<GrantCreditsResult> {
  const { organizationId, amount, reason, idempotencyKey, userId } = params;

  if (amount <= 0) {
    throw new BadRequestError("Amount must be positive", "INVALID_AMOUNT");
  }

  // Check idempotency
  if (idempotencyKey) {
    const existingOperation = await db
      .select()
      .from(creditOperations)
      .where(
        and(
          eq(creditOperations.organizationId, organizationId),
          eq(creditOperations.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);

    if (existingOperation.length > 0) {
      const balance = await getBalance(organizationId);
      return {
        operationId: existingOperation[0].id,
        granted: existingOperation[0].amount,
        balanceAfter: balance,
      };
    }
  }

  // Get or create granted balance (using upsert to handle race conditions)
  let [grantedBalance] = await db
    .select()
    .from(creditBalances)
    .where(
      and(
        eq(creditBalances.organizationId, organizationId),
        eq(creditBalances.balanceType, "granted")
      )
    )
    .limit(1);

  if (!grantedBalance) {
    // Use onConflictDoNothing to handle race conditions
    await db
      .insert(creditBalances)
      .values({
        id: nanoid(),
        organizationId,
        balanceType: "granted",
        amount: 0,
      })
      .onConflictDoNothing();

    // Re-fetch the balance (either we created it or it already existed)
    [grantedBalance] = await db
      .select()
      .from(creditBalances)
      .where(
        and(
          eq(creditBalances.organizationId, organizationId),
          eq(creditBalances.balanceType, "granted")
        )
      )
      .limit(1);
  }

  // Create operation (handle race condition with idempotency key)
  const operationId = nanoid();
  try {
    await db.insert(creditOperations).values({
      id: operationId,
      organizationId,
      operationType: "grant",
      amount,
      idempotencyKey,
      description: reason,
      userId,
    });
  } catch (error: unknown) {
    // If duplicate idempotency key, return the existing operation
    const pgError = error as { code?: string };
    if (pgError.code === "23505" && idempotencyKey) {
      const [existingOp] = await db
        .select()
        .from(creditOperations)
        .where(
          and(
            eq(creditOperations.organizationId, organizationId),
            eq(creditOperations.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      if (existingOp) {
        const balance = await getBalance(organizationId);
        return {
          operationId: existingOp.id,
          granted: existingOp.amount,
          balanceAfter: balance,
        };
      }
    }
    throw error;
  }

  // Update balance
  const newAmount = grantedBalance.amount + amount;
  await db
    .update(creditBalances)
    .set({
      amount: newAmount,
      updatedAt: new Date(),
    })
    .where(eq(creditBalances.id, grantedBalance.id));

  // Create transaction record
  await db.insert(creditTransactions).values({
    id: nanoid(),
    operationId,
    balanceId: grantedBalance.id,
    amount,
    balanceBefore: grantedBalance.amount,
    balanceAfter: newAmount,
  });

  const balanceAfter = await getBalance(organizationId);

  return {
    operationId,
    granted: amount,
    balanceAfter,
  };
}

export interface AddPurchasedCreditsParams {
  organizationId: string;
  amount: number;
  idempotencyKey: string;
  description?: string;
  userId?: string;
}

export async function addPurchasedCredits(
  params: AddPurchasedCreditsParams
): Promise<GrantCreditsResult> {
  const { organizationId, amount, idempotencyKey, description, userId } = params;

  if (amount <= 0) {
    throw new BadRequestError("Amount must be positive", "INVALID_AMOUNT");
  }

  // Check idempotency
  const existingOperation = await db
    .select()
    .from(creditOperations)
    .where(
      and(
        eq(creditOperations.organizationId, organizationId),
        eq(creditOperations.idempotencyKey, idempotencyKey)
      )
    )
    .limit(1);

  if (existingOperation.length > 0) {
    const balance = await getBalance(organizationId);
    return {
      operationId: existingOperation[0].id,
      granted: existingOperation[0].amount,
      balanceAfter: balance,
    };
  }

  // Get or create purchased balance (using upsert to handle race conditions)
  let [purchasedBalance] = await db
    .select()
    .from(creditBalances)
    .where(
      and(
        eq(creditBalances.organizationId, organizationId),
        eq(creditBalances.balanceType, "purchased")
      )
    )
    .limit(1);

  if (!purchasedBalance) {
    await db
      .insert(creditBalances)
      .values({
        id: nanoid(),
        organizationId,
        balanceType: "purchased",
        amount: 0,
      })
      .onConflictDoNothing();

    [purchasedBalance] = await db
      .select()
      .from(creditBalances)
      .where(
        and(
          eq(creditBalances.organizationId, organizationId),
          eq(creditBalances.balanceType, "purchased")
        )
      )
      .limit(1);
  }

  // Create operation
  const operationId = nanoid();
  await db.insert(creditOperations).values({
    id: operationId,
    organizationId,
    operationType: "purchase",
    amount,
    idempotencyKey,
    description,
    userId,
  });

  // Update balance
  const newAmount = purchasedBalance.amount + amount;
  await db
    .update(creditBalances)
    .set({
      amount: newAmount,
      updatedAt: new Date(),
    })
    .where(eq(creditBalances.id, purchasedBalance.id));

  // Create transaction record
  await db.insert(creditTransactions).values({
    id: nanoid(),
    operationId,
    balanceId: purchasedBalance.id,
    amount,
    balanceBefore: purchasedBalance.amount,
    balanceAfter: newAmount,
  });

  const balanceAfter = await getBalance(organizationId);

  return {
    operationId,
    granted: amount,
    balanceAfter,
  };
}

// Get credit history for an organization
export async function getCreditHistory(
  organizationId: string,
  limit = 50,
  offset = 0
) {
  const operations = await db
    .select()
    .from(creditOperations)
    .where(eq(creditOperations.organizationId, organizationId))
    .orderBy(sql`${creditOperations.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  return operations;
}
