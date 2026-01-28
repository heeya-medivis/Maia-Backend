import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { API_URL, APP_URL, CLIENT_ID } from '@/lib/env';

// Store PKCE and state in cookies (short-lived, for the OAuth flow)
const STATE_COOKIE = 'maia_oauth_state';
const VERIFIER_COOKIE = 'maia_oauth_verifier';
const REDIRECT_COOKIE = 'maia_oauth_redirect';

// Allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PATHS = ['/user', '/dashboard', '/settings', '/auth/complete', '/admin'];

function generateRandomString(length: number): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

function sha256Base64Url(value: string): string {
  return crypto.createHash('sha256').update(value).digest('base64url');
}

/**
 * Validate redirect URL to prevent open redirect attacks.
 * Only allows paths starting with allowed prefixes (no external URLs).
 */
function validateRedirect(redirectTo: string): string {
  // Must start with / (relative path)
  if (!redirectTo.startsWith('/')) {
    return '/user';
  }

  // Block protocol-relative URLs (//evil.com)
  if (redirectTo.startsWith('//')) {
    return '/user';
  }

  // Check against allowed paths
  const isAllowed = ALLOWED_REDIRECT_PATHS.some((path) => redirectTo.startsWith(path));
  if (!isAllowed) {
    return '/user';
  }

  return redirectTo;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') ?? 'google';
  const rawRedirect = searchParams.get('redirect') ?? '/user';
  const redirectTo = validateRedirect(rawRedirect);
  const loginHint = searchParams.get('login_hint');
  const connectionId = searchParams.get('connection_id');

  // Generate PKCE values
  const codeVerifier = generateRandomString(64);
  const codeChallenge = sha256Base64Url(codeVerifier);
  const state = generateRandomString(32);

  // Build the authorize URL
  const authorizeUrl = new URL(`${API_URL}/v1/oauth/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', `${APP_URL}/api/auth/callback`);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');

  if (connectionId) {
    authorizeUrl.searchParams.set('connection_id', connectionId);
  } else {
    authorizeUrl.searchParams.set('provider', provider);
  }

  if (loginHint) {
    authorizeUrl.searchParams.set('login_hint', loginHint);
  }

  // Create response with redirect
  const response = NextResponse.redirect(authorizeUrl.toString());

  // Store values in httpOnly cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  };

  response.cookies.set(STATE_COOKIE, state, cookieOptions);
  response.cookies.set(REDIRECT_COOKIE, redirectTo, cookieOptions);
  response.cookies.set(VERIFIER_COOKIE, codeVerifier, cookieOptions);

  return response;
}
