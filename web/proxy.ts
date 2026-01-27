import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_SECRET, SESSION_COOKIE } from './lib/env';

// Routes that require authentication
const protectedRoutes = ['/user'];

// Routes that should redirect authenticated users
const authRoutes = ['/login'];

interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  tenantId: string;
  tenantName: string | null;
  role: 'super_admin' | 'admin' | 'user';
  tenantRole: 'admin' | 'clinician' | 'viewer';
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SessionUser;
}

/**
 * Base64URL decode (Edge-compatible)
 */
function base64UrlDecode(str: string): string {
  // Convert base64url to base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  // Decode
  return atob(padded);
}

/**
 * Base64URL encode (Edge-compatible)
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Verify HMAC signature using Web Crypto API (Edge-compatible)
 */
async function verifyHmac(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const expectedSignature = base64UrlEncode(signatureBuffer);

  // Compare signatures (not constant-time in middleware, but acceptable for role checks)
  return signature === expectedSignature;
}

/**
 * Verify and parse a signed session cookie.
 * Returns null if the signature is invalid (tampering detected).
 */
async function verifySession(signedValue: string): Promise<Session | null> {
  const parts = signedValue.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, signature] = parts;

  try {
    const payload = base64UrlDecode(payloadB64);
    const isValid = await verifyHmac(payload, signature, SESSION_SECRET);

    if (!isValid) {
      console.warn('Session cookie signature mismatch - possible tampering');
      return null;
    }

    return JSON.parse(payload) as Session;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  // Verify session signature before trusting any data
  let session: Session | null = null;
  if (sessionCookie?.value) {
    session = await verifySession(sessionCookie.value);
  }

  // Check if access token has expired
  // IMPORTANT: Do NOT treat access token expiry as session expiry.
  // The session is still valid if we have a refresh token - the auth API route
  // will handle token refresh when needed. We only consider the session
  // invalid if it's completely missing or the signature is invalid.
  //
  // For protected routes with expired access tokens, we let the request through.
  // The page's server component will call getSession() which will:
  // 1. Detect the expired token
  // 2. Redirect to /api/auth/refresh to get new tokens
  // 3. Refresh tokens via the backend and update cookies (route handlers CAN set cookies)

  // Session is authenticated if we have a valid session structure
  // (even if access token is expired - refresh token may still be valid)
  const isAuthenticated = session !== null;

  // Check if trying to access protected routes without auth
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth routes
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && isAuthenticated) {
    // All users go to /user dashboard for now
    return NextResponse.redirect(new URL('/user', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files, api routes, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
