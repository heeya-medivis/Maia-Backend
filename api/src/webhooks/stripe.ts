import { Hono } from "hono";

const stripeWebhooks = new Hono();

// Stripe webhooks - deferred to v2
// Will handle:
// - checkout.session.completed
// - invoice.paid
// - invoice.payment_failed
// - customer.subscription.created
// - customer.subscription.updated
// - customer.subscription.deleted

stripeWebhooks.post("/", async (c) => {
  // TODO: Implement Stripe webhook handling in v2
  console.log("Stripe webhook received - not yet implemented");
  return c.json({ received: true, message: "Stripe webhooks deferred to v2" });
});

export default stripeWebhooks;
