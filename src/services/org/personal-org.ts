import { createClerkClient } from "@clerk/backend";
import { env } from "../../config/env.js";
import { db } from "../../db/index.js";
import { users, organizations, orgMembers } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { grantCredits } from "../credits/ledger.js";
import { TIER_DEFAULTS } from "../entitlements/index.js";

const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

// Constants for personal orgs
const FREE_TIER_INITIAL_CREDITS = 50;

export interface PersonalOrgResult {
  organizationId: string;
  isNew: boolean;
}

/**
 * Ensures a user has a personal organization.
 * Creates one in Clerk if it doesn't exist.
 *
 * Based on PLAN.md:
 * - Personal orgs are identified by metadata: { maia_personal_org: true, owner_user_id: userId }
 * - Created lazily on first device auth or when user leaves all teams
 */
export async function ensurePersonalOrg(userId: string): Promise<PersonalOrgResult> {
  // First check if user already has a personal org in our DB
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // If user already has a personal org ID, verify it exists
  if (user.personalOrgId) {
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.personalOrgId))
      .limit(1);

    if (existingOrg) {
      // Ensure user is a member
      await ensureOrgMembership(userId, user.personalOrgId, "admin");
      return { organizationId: user.personalOrgId, isNew: false };
    }
  }

  // Check Clerk for existing personal org
  const memberships = await clerkClient.users.getOrganizationMembershipList({ userId });

  const existingPersonalOrg = memberships.data.find(
    (m) => m.organization.publicMetadata?.maia_personal_org === true
  );

  if (existingPersonalOrg) {
    // Sync to our DB
    const orgId = existingPersonalOrg.organization.id;
    await syncPersonalOrgToDb(userId, existingPersonalOrg.organization);
    return { organizationId: orgId, isNew: false };
  }

  // Create new personal org in Clerk
  const orgName = `${user.email.split("@")[0]}'s Workspace`;

  let newOrg;
  try {
    newOrg = await clerkClient.organizations.createOrganization({
      name: orgName,
      createdBy: userId,
      publicMetadata: {
        maia_personal_org: true,
        owner_user_id: userId,
      },
    });
  } catch (error: unknown) {
    const clerkError = error as { status?: number; errors?: Array<{ message: string }> };
    if (clerkError.status === 403) {
      throw new Error(
        "Organizations not enabled in Clerk. Go to Clerk Dashboard → Configure → Organization settings to enable."
      );
    }
    throw error;
  }

  console.log(`Created personal org ${newOrg.id} for user ${userId}`);

  // The org.created webhook will handle DB sync and initial credits
  // But we also sync here in case webhook is delayed
  await syncPersonalOrgToDb(userId, newOrg);

  return { organizationId: newOrg.id, isNew: true };
}

/**
 * Sync a personal org from Clerk to our database
 */
async function syncPersonalOrgToDb(
  userId: string,
  clerkOrg: { id: string; name: string; slug?: string | null; imageUrl?: string }
) {
  const tier = "free";

  // Upsert organization
  await db
    .insert(organizations)
    .values({
      id: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug,
      tier,
      imageUrl: clerkOrg.imageUrl,
      metadata: { maia_personal_org: true, owner_user_id: userId },
      maxSeats: 1,
      maxDevicesPerUser: TIER_DEFAULTS[tier].maxDevices,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: clerkOrg.name,
        slug: clerkOrg.slug,
        imageUrl: clerkOrg.imageUrl,
        updatedAt: new Date(),
      },
    });

  // Update user's personal_org_id
  await db
    .update(users)
    .set({
      personalOrgId: clerkOrg.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Ensure membership
  await ensureOrgMembership(userId, clerkOrg.id, "admin");

  // Grant initial credits (idempotent)
  await grantCredits({
    organizationId: clerkOrg.id,
    amount: FREE_TIER_INITIAL_CREDITS,
    reason: "Initial free tier credits",
    idempotencyKey: `initial_grant_${clerkOrg.id}`,
  });

  console.log(`Synced personal org ${clerkOrg.id} for user ${userId}`);
}

/**
 * Ensure user is a member of an organization
 */
async function ensureOrgMembership(userId: string, orgId: string, role: "owner" | "admin" | "member") {
  await db
    .insert(orgMembers)
    .values({
      userId,
      organizationId: orgId,
      role,
    })
    .onConflictDoUpdate({
      target: [orgMembers.userId, orgMembers.organizationId],
      set: {
        role,
        updatedAt: new Date(),
      },
    });
}

/**
 * Check if a user has any non-personal org memberships
 */
export async function hasTeamMemberships(userId: string): Promise<boolean> {
  const memberships = await clerkClient.users.getOrganizationMembershipList({ userId });

  return memberships.data.some(
    (m) => m.organization.publicMetadata?.maia_personal_org !== true
  );
}

/**
 * Get user's active organization (prefer team org over personal)
 */
export async function getActiveOrganization(userId: string): Promise<string | null> {
  const memberships = await clerkClient.users.getOrganizationMembershipList({ userId });

  if (memberships.data.length === 0) {
    return null;
  }

  // Prefer team org over personal
  const teamOrg = memberships.data.find(
    (m) => m.organization.publicMetadata?.maia_personal_org !== true
  );

  if (teamOrg) {
    return teamOrg.organization.id;
  }

  // Fall back to personal org
  return memberships.data[0].organization.id;
}
