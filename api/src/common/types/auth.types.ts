/**
 * Common types for Maia Backend
 */

/**
 * Authenticated user context attached to requests by JwtAuthGuard.
 * This is the minimal auth info stored in request.user.
 * For full user data (firstName, lastName, etc.), use request.dbUser.
 */
export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
  sessionId: string;
  deviceId: string;
}
