import { Hono } from "hono";
import { authMiddleware, requireOrgMiddleware } from "../middleware/auth.js";
import { getEntitlements, hasFeatureAccess } from "../services/entitlements/index.js";
import { BadRequestError, NotFoundError } from "../middleware/error.js";

const entitlements = new Hono();

// All routes require auth
entitlements.use("*", authMiddleware);

// GET /entitlements - Get user's entitlements
entitlements.get("/", requireOrgMiddleware, async (c) => {
  const authUser = c.get("user");

  if (!authUser.organizationId) {
    throw new BadRequestError("Organization required", "ORG_REQUIRED");
  }

  const userEntitlements = await getEntitlements(authUser.id, authUser.organizationId);

  if (!userEntitlements) {
    throw new NotFoundError("Entitlements not found", "ENTITLEMENTS_NOT_FOUND");
  }

  return c.json({
    entitlements: userEntitlements,
  });
});

// GET /entitlements/check/:feature - Check if user has access to specific feature
entitlements.get("/check/:feature", requireOrgMiddleware, async (c) => {
  const authUser = c.get("user");
  const feature = c.req.param("feature");

  if (!authUser.organizationId) {
    throw new BadRequestError("Organization required", "ORG_REQUIRED");
  }

  const hasAccess = await hasFeatureAccess(authUser.id, authUser.organizationId, feature);

  return c.json({
    feature,
    hasAccess,
    organizationId: authUser.organizationId,
  });
});

export default entitlements;
