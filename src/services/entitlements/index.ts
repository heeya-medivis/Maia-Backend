import { db } from "../../db/index.js";
import {
  organizations,
  featureFlags,
  OrganizationTier,
  FEATURE_KEYS,
} from "../../db/schema/index.js";
import { eq, and, isNull, or, gt } from "drizzle-orm";

// Tier defaults
export const TIER_DEFAULTS: Record<OrganizationTier, TierEntitlements> = {
  free: {
    monthlyCredits: 50,
    maxDevices: 1,
    maxConversations: 10,
    maiaAccess: true,
    prioritySupport: false,
    advancedAnalytics: false,
  },
  pro: {
    monthlyCredits: 500,
    maxDevices: 3,
    maxConversations: 100,
    maiaAccess: true,
    prioritySupport: true,
    advancedAnalytics: false,
  },
  enterprise: {
    monthlyCredits: 5000,
    maxDevices: 10,
    maxConversations: -1, // Unlimited
    maiaAccess: true,
    prioritySupport: true,
    advancedAnalytics: true,
  },
};

export interface TierEntitlements {
  monthlyCredits: number;
  maxDevices: number;
  maxConversations: number;
  maiaAccess: boolean;
  prioritySupport: boolean;
  advancedAnalytics: boolean;
}

export interface UserEntitlements extends TierEntitlements {
  tier: OrganizationTier;
  organizationId: string;
  organizationName: string;
}

export async function getEntitlements(
  userId: string,
  organizationId?: string
): Promise<UserEntitlements | null> {
  // Get organization (either specified or first one user belongs to)
  let orgQuery = db
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, organizationId!), isNull(organizations.deletedAt)));

  if (!organizationId) {
    // This would need to join with org_members to find user's org
    // For now, return null if no org specified
    return null;
  }

  const [org] = await orgQuery.limit(1);

  if (!org) {
    return null;
  }

  // Start with tier defaults
  const tier = org.tier as OrganizationTier;
  const defaults = TIER_DEFAULTS[tier];

  const entitlements: UserEntitlements = {
    ...defaults,
    tier,
    organizationId: org.id,
    organizationName: org.name,
  };

  // Apply org-level overrides
  const orgFlags = await db
    .select()
    .from(featureFlags)
    .where(
      and(
        eq(featureFlags.organizationId, org.id),
        isNull(featureFlags.userId),
        or(
          isNull(featureFlags.expiresAt),
          gt(featureFlags.expiresAt, new Date())
        )
      )
    );

  for (const flag of orgFlags) {
    applyFlag(entitlements, flag);
  }

  // Apply user-level overrides (highest priority)
  const userFlags = await db
    .select()
    .from(featureFlags)
    .where(
      and(
        eq(featureFlags.userId, userId),
        or(
          isNull(featureFlags.expiresAt),
          gt(featureFlags.expiresAt, new Date())
        )
      )
    );

  for (const flag of userFlags) {
    applyFlag(entitlements, flag);
  }

  return entitlements;
}

function applyFlag(
  entitlements: UserEntitlements,
  flag: typeof featureFlags.$inferSelect
): void {
  switch (flag.featureKey) {
    case FEATURE_KEYS.MONTHLY_CREDITS:
      if (flag.valueInt !== null) {
        entitlements.monthlyCredits = flag.valueInt;
      }
      break;
    case FEATURE_KEYS.MAX_DEVICES:
      if (flag.valueInt !== null) {
        entitlements.maxDevices = flag.valueInt;
      }
      break;
    case FEATURE_KEYS.MAX_CONVERSATIONS:
      if (flag.valueInt !== null) {
        entitlements.maxConversations = flag.valueInt;
      }
      break;
    case FEATURE_KEYS.MAIA_ACCESS:
      if (flag.enabled !== null) {
        entitlements.maiaAccess = flag.enabled;
      }
      break;
    case FEATURE_KEYS.PRIORITY_SUPPORT:
      if (flag.enabled !== null) {
        entitlements.prioritySupport = flag.enabled;
      }
      break;
    case FEATURE_KEYS.ADVANCED_ANALYTICS:
      if (flag.enabled !== null) {
        entitlements.advancedAnalytics = flag.enabled;
      }
      break;
  }
}

// Check if user has access to a specific feature
export async function hasFeatureAccess(
  userId: string,
  organizationId: string,
  featureKey: string
): Promise<boolean> {
  const entitlements = await getEntitlements(userId, organizationId);

  if (!entitlements) {
    return false;
  }

  switch (featureKey) {
    case FEATURE_KEYS.MAIA_ACCESS:
      return entitlements.maiaAccess;
    case FEATURE_KEYS.PRIORITY_SUPPORT:
      return entitlements.prioritySupport;
    case FEATURE_KEYS.ADVANCED_ANALYTICS:
      return entitlements.advancedAnalytics;
    default:
      return false;
  }
}

// Get feature limit
export async function getFeatureLimit(
  userId: string,
  organizationId: string,
  featureKey: string
): Promise<number> {
  const entitlements = await getEntitlements(userId, organizationId);

  if (!entitlements) {
    return 0;
  }

  switch (featureKey) {
    case FEATURE_KEYS.MONTHLY_CREDITS:
      return entitlements.monthlyCredits;
    case FEATURE_KEYS.MAX_DEVICES:
      return entitlements.maxDevices;
    case FEATURE_KEYS.MAX_CONVERSATIONS:
      return entitlements.maxConversations;
    default:
      return 0;
  }
}
