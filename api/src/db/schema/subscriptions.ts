import { pgTable, text, timestamp, pgEnum, integer, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "unpaid",
  "paused",
]);

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // Stripe subscription ID
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripePriceId: text("stripe_price_id"),
  status: subscriptionStatusEnum("status").notNull(),
  quantity: integer("quantity").default(1),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAt: timestamp("cancel_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  trialStart: timestamp("trial_start", { withTimezone: true }),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
