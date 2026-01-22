import { Hono } from "hono";
import { Webhook } from "svix";
import { db } from "../db/index.js";
import { users, organizations, orgMembers } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { grantCredits } from "../services/credits/ledger.js";
import { TIER_DEFAULTS } from "../services/entitlements/index.js";

const clerkWebhooks = new Hono();

interface ClerkWebhookEvent {
  type: string;
  data: Record<string, unknown>;
}

// Verify webhook signature
async function verifyWebhook(
  payload: string,
  headers: { svix_id?: string; svix_timestamp?: string; svix_signature?: string }
): Promise<ClerkWebhookEvent> {
  if (!env.CLERK_WEBHOOK_SECRET) {
    throw new Error("CLERK_WEBHOOK_SECRET not configured");
  }

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  const evt = wh.verify(payload, {
    "svix-id": headers.svix_id || "",
    "svix-timestamp": headers.svix_timestamp || "",
    "svix-signature": headers.svix_signature || "",
  }) as ClerkWebhookEvent;

  return evt;
}

// POST /webhooks/clerk - Handle Clerk webhook events
clerkWebhooks.post("/", async (c) => {
  const payload = await c.req.text();
  const headers = {
    svix_id: c.req.header("svix-id"),
    svix_timestamp: c.req.header("svix-timestamp"),
    svix_signature: c.req.header("svix-signature"),
  };

  let event: ClerkWebhookEvent;

  try {
    event = await verifyWebhook(payload, headers);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return c.json({ error: "Webhook verification failed" }, 400);
  }

  console.log(`Received Clerk webhook: ${event.type}`);

  try {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(event.data);
        break;
      case "user.updated":
        await handleUserUpdated(event.data);
        break;
      case "user.deleted":
        await handleUserDeleted(event.data);
        break;
      case "organization.created":
        await handleOrgCreated(event.data);
        break;
      case "organization.updated":
        await handleOrgUpdated(event.data);
        break;
      case "organization.deleted":
        await handleOrgDeleted(event.data);
        break;
      case "organizationMembership.created":
        await handleMembershipCreated(event.data);
        break;
      case "organizationMembership.deleted":
        await handleMembershipDeleted(event.data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling webhook ${event.type}:`, err);
    // Return 200 to acknowledge receipt, but log the error
  }

  return c.json({ received: true });
});

// User created
async function handleUserCreated(data: Record<string, unknown>) {
  const userId = data.id as string;
  const emailAddresses = data.email_addresses as Array<{ email_address: string; verification?: { status: string } }>;
  const primaryEmail = emailAddresses?.[0];

  await db.insert(users).values({
    id: userId,
    email: primaryEmail?.email_address ?? "",
    firstName: data.first_name as string | null,
    lastName: data.last_name as string | null,
    imageUrl: data.image_url as string | null,
    emailVerified: primaryEmail?.verification?.status === "verified",
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      email: primaryEmail?.email_address ?? "",
      firstName: data.first_name as string | null,
      lastName: data.last_name as string | null,
      imageUrl: data.image_url as string | null,
      emailVerified: primaryEmail?.verification?.status === "verified",
      updatedAt: new Date(),
    },
  });

  console.log(`User created/updated: ${userId}`);
}

// User updated (upsert to handle missed user.created events)
async function handleUserUpdated(data: Record<string, unknown>) {
  const userId = data.id as string;
  const emailAddresses = data.email_addresses as Array<{ email_address: string; verification?: { status: string } }>;
  const primaryEmail = emailAddresses?.[0];

  await db.insert(users).values({
    id: userId,
    email: primaryEmail?.email_address ?? "",
    firstName: data.first_name as string | null,
    lastName: data.last_name as string | null,
    imageUrl: data.image_url as string | null,
    emailVerified: primaryEmail?.verification?.status === "verified",
  }).onConflictDoUpdate({
    target: users.id,
    set: {
      email: primaryEmail?.email_address ?? "",
      firstName: data.first_name as string | null,
      lastName: data.last_name as string | null,
      imageUrl: data.image_url as string | null,
      emailVerified: primaryEmail?.verification?.status === "verified",
      updatedAt: new Date(),
    },
  });

  console.log(`User updated: ${userId}`);
}

// User deleted
async function handleUserDeleted(data: Record<string, unknown>) {
  const userId = data.id as string;

  // Soft delete
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  console.log(`User deleted: ${userId}`);
}

// Organization created
async function handleOrgCreated(data: Record<string, unknown>) {
  const orgId = data.id as string;
  const tier = "free"; // Default tier for new orgs
  const publicMetadata = data.public_metadata as Record<string, unknown> | undefined;
  const isPersonalOrg = publicMetadata?.maia_personal_org === true;
  const ownerUserId = publicMetadata?.owner_user_id as string | undefined;

  // Store metadata for personal orgs
  const metadata = isPersonalOrg
    ? { maia_personal_org: true, owner_user_id: ownerUserId }
    : undefined;

  await db.insert(organizations).values({
    id: orgId,
    name: data.name as string,
    slug: data.slug as string | null,
    tier,
    imageUrl: data.image_url as string | null,
    metadata,
    maxSeats: isPersonalOrg ? 1 : TIER_DEFAULTS[tier].maxDevices,
    maxDevicesPerUser: TIER_DEFAULTS[tier].maxDevices,
  }).onConflictDoUpdate({
    target: organizations.id,
    set: {
      name: data.name as string,
      slug: data.slug as string | null,
      imageUrl: data.image_url as string | null,
      metadata,
      updatedAt: new Date(),
    },
  });

  // If personal org, set user's personal_org_id and create membership
  if (isPersonalOrg && ownerUserId) {
    // Update user's personal_org_id
    await db
      .update(users)
      .set({
        personalOrgId: orgId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ownerUserId));

    // Ensure owner is a member (admin role for personal orgs)
    await db
      .insert(orgMembers)
      .values({
        userId: ownerUserId,
        organizationId: orgId,
        role: "admin",
      })
      .onConflictDoNothing();

    console.log(`Personal org ${orgId} linked to user ${ownerUserId}`);
  }

  // Grant initial credits (50 for free tier)
  const creditAmount = isPersonalOrg ? 50 : TIER_DEFAULTS[tier].monthlyCredits;
  await grantCredits({
    organizationId: orgId,
    amount: creditAmount,
    reason: isPersonalOrg ? "Initial free tier credits" : "Initial credit grant for new organization",
    idempotencyKey: `org_created_${orgId}`,
  });

  console.log(`Organization created: ${orgId} (personal: ${isPersonalOrg})`);
}

// Organization updated
async function handleOrgUpdated(data: Record<string, unknown>) {
  const orgId = data.id as string;

  await db
    .update(organizations)
    .set({
      name: data.name as string,
      slug: data.slug as string | null,
      imageUrl: data.image_url as string | null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));

  console.log(`Organization updated: ${orgId}`);
}

// Organization deleted
async function handleOrgDeleted(data: Record<string, unknown>) {
  const orgId = data.id as string;

  // Soft delete
  await db
    .update(organizations)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));

  console.log(`Organization deleted: ${orgId}`);
}

// Membership created
async function handleMembershipCreated(data: Record<string, unknown>) {
  const orgData = data.organization as { id: string };
  const memberData = data.public_user_data as { user_id: string };
  const role = data.role as string;

  // Map Clerk roles to our roles
  const mappedRole = role === "admin" ? "admin" : role === "owner" ? "owner" : "member";

  await db.insert(orgMembers).values({
    userId: memberData.user_id,
    organizationId: orgData.id,
    role: mappedRole,
  }).onConflictDoUpdate({
    target: [orgMembers.userId, orgMembers.organizationId],
    set: {
      role: mappedRole,
      updatedAt: new Date(),
    },
  });

  console.log(`Membership created: user ${memberData.user_id} in org ${orgData.id} as ${mappedRole}`);
}

// Membership deleted
async function handleMembershipDeleted(data: Record<string, unknown>) {
  const orgData = data.organization as { id: string };
  const memberData = data.public_user_data as { user_id: string };

  await db
    .delete(orgMembers)
    .where(
      eq(orgMembers.userId, memberData.user_id)
    );

  console.log(`Membership deleted: user ${memberData.user_id} from org ${orgData.id}`);
}

export default clerkWebhooks;
