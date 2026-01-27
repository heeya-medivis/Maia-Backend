import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { SESSION_SECRET, SESSION_COOKIE } from './env';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
  isAdmin: boolean;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

/**
 * Verify and parse a signed session cookie.
 * Returns null if the signature is invalid (tampering detected).
 */
export function verifySession(signedValue: string): Session | null {
  const parts = signedValue.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, signature] = parts;

  try {
    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.warn('Session cookie signature mismatch - possible tampering');
      return null;
    }

    return JSON.parse(payload) as Session;
  } catch {
    return null;
  }
}


/**
 * Get the current session from cookies.
 * Returns null if no session, session is invalid, or signature verification fails.
 *
 * IMPORTANT: This function runs in Server Component context where cookies cannot be set.
 * If the access token is expired, we return the session with an `accessTokenExpired` flag
 * so the caller can redirect to the refresh API route if needed.
 */
export async function getSession(): Promise<(Session & { accessTokenExpired?: boolean }) | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return null;
  }

  // Verify the signed session (prevents tampering)
  const session = verifySession(sessionCookie.value);
  if (!session) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  // NOTE: We can't refresh here because Server Components cannot set cookies.
  // Instead, return the session with a flag so the caller can redirect to
  // /api/auth/refresh which CAN set cookies (it's a Route Handler).
  if (session.expiresAt < Date.now() + 5 * 60 * 1000) {
    return { ...session, accessTokenExpired: true };
  }

  return session;
}

/**
 * Sign session data with HMAC to prevent tampering.
 * Exported for use in API route handlers that can set cookies.
 */
export function signSession(data: object): string {
  const payload = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

/**
 * Get the current user or redirect to login.
 * Use this in server components that require authentication.
 *
 * If the access token is expired but we have a valid refresh token,
 * redirects to /api/auth/refresh to get new tokens.
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // If access token is expired, redirect to refresh endpoint
  // The refresh endpoint is a Route Handler that CAN set cookies
  if (session.accessTokenExpired) {
    // Redirect to refresh API which will refresh tokens and redirect back
    redirect('/api/auth/refresh');
  }

  return session;
}

/**
 * Get the current user or null.
 * Use this in server components that work with or without auth.
 */
export async function getUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Check if user has admin role.
 */
export function hasAdminRole(user: AuthUser): boolean {
  return user.isAdmin === true;
}

/**
 * Get the current user or redirect to login.
 * If user is not admin, redirect to /user.
 * Use this in server components that require admin access.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  
  if (!session.user.isAdmin) {
    redirect('/user');
  }
  
  return session;
}

/**
 * Clear the session cookie.
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
