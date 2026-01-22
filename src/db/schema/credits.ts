import { pgTable, text, timestamp, pgEnum, integer, index, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const creditBalanceTypeEnum = pgEnum("credit_balance_type", ["granted", "purchased"]);
export const creditOperationTypeEnum = pgEnum("credit_operation_type", [
  "grant",
  "purchase",
  "consume",
  "refund",
  "expire",
  "adjustment",
]);

// Credit balances per organization, split by type
export const creditBalances = pgTable(
  "credit_balances",
  {
    id: text("id").primaryKey(), // nanoid
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    balanceType: creditBalanceTypeEnum("balance_type").notNull(),
    amount: integer("amount").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("credit_balances_org_type_unique").on(table.organizationId, table.balanceType),
    index("credit_balances_org_idx").on(table.organizationId),
  ]
);

// Credit operations (the ledger) with idempotency
export const creditOperations = pgTable(
  "credit_operations",
  {
    id: text("id").primaryKey(), // nanoid
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    operationType: creditOperationTypeEnum("operation_type").notNull(),
    amount: integer("amount").notNull(), // Positive for grants/purchases, negative for consumption
    idempotencyKey: text("idempotency_key"), // For deduplication
    description: text("description"),
    metadata: text("metadata"), // JSON string for flexibility
    userId: text("user_id"), // User who triggered the operation (if applicable)
    aiRequestId: text("ai_request_id"), // Link to AI request if consumption
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("credit_operations_idempotency_unique").on(table.organizationId, table.idempotencyKey),
    index("credit_operations_org_idx").on(table.organizationId),
    index("credit_operations_created_idx").on(table.createdAt),
  ]
);

// Per-balance-type transaction rows for audit trail
export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id").primaryKey(), // nanoid
    operationId: text("operation_id")
      .notNull()
      .references(() => creditOperations.id, { onDelete: "cascade" }),
    balanceId: text("balance_id")
      .notNull()
      .references(() => creditBalances.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("credit_transactions_operation_idx").on(table.operationId),
    index("credit_transactions_balance_idx").on(table.balanceId),
  ]
);

export type CreditBalance = typeof creditBalances.$inferSelect;
export type NewCreditBalance = typeof creditBalances.$inferInsert;
export type CreditBalanceType = "granted" | "purchased";

export type CreditOperation = typeof creditOperations.$inferSelect;
export type NewCreditOperation = typeof creditOperations.$inferInsert;
export type CreditOperationType = "grant" | "purchase" | "consume" | "refund" | "expire" | "adjustment";

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
