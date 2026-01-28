import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, API_URL, APP_URL, CLIENT_ID } from '@/lib/env';
import { signSession } from '@/lib/auth';

const STATE_COOKIE = 'maia_oauth_state';
const VERIFIER_COOKIE = 'maia_oauth_verifier';
const REDIRECT_COOKIE = 'maia_oauth_redirect';

// Allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PATHS = ['/user', '/dashboard', '/settings', '/auth/complete', '/admin'];

/**
 * Validate redirect URL to prevent open redirect attacks.
 */
function validateRedirect(redirectTo: string): string {
  if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return '/user';
  }
  const isAllowed = ALLOWED_REDIRECT_PATHS.some((path) => redirectTo.startsWith(path));
  return isAllowed ? redirectTo : '/user';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle error from OAuth provider
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    const errorUrl = new URL('/login', APP_URL);
    errorUrl.searchParams.set('error', errorDescription ?? error);
    return NextResponse.redirect(errorUrl.toString());
  }

  // Validate code and state
  if (!code || !state) {
    const errorUrl = new URL('/login', APP_URL);
    errorUrl.searchParams.set('error', 'Missing authorization code or state');
    return NextResponse.redirect(errorUrl.toString());
  }

  // Get stored values from cookies
  const storedState = request.cookies.get(STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  const rawRedirect = request.cookies.get(REDIRECT_COOKIE)?.value ?? '/user';
  const redirectTo = validateRedirect(rawRedirect);

  // Validate state
  if (!storedState || storedState !== state) {
    const errorUrl = new URL('/login', APP_URL);
    errorUrl.searchParams.set('error', 'Invalid state - possible CSRF attack');
    return NextResponse.redirect(errorUrl.toString());
  }

  // We need the code verifier to exchange the code
  if (!codeVerifier) {
    const errorUrl = new URL('/login', APP_URL);
    errorUrl.searchParams.set('error', 'Missing code verifier');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${API_URL}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${APP_URL}/api/auth/callback`,
        client_id: CLIENT_ID,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Token exchange failed:', errorData);
      const errorUrl = new URL('/login', APP_URL);
      errorUrl.searchParams.set('error', errorData.message ?? 'Failed to exchange code for tokens');
      return NextResponse.redirect(errorUrl.toString());
    }

    const tokens = await tokenResponse.json();

    // Fetch user info from /v1/auth/me
    const meResponse = await fetch(`${API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (!meResponse.ok) {
      console.error('Failed to fetch user info');
      const errorUrl = new URL('/login', APP_URL);
      errorUrl.searchParams.set('error', 'Failed to fetch user information');
      return NextResponse.redirect(errorUrl.toString());
    }

    const meData = await meResponse.json();
    
    // The /v1/auth/me endpoint returns { user: { id, email, firstName, lastName, isAdmin, ... }, devices: [...] }
    const userInfo = meData.user;

    // Create session object with isAdmin from the response
    const isAdmin = userInfo?.isAdmin === true;
    const displayName = userInfo?.firstName && userInfo?.lastName 
      ? `${userInfo.firstName} ${userInfo.lastName}` 
      : userInfo?.firstName || userInfo?.email?.split('@')[0] || '';

    // Parse expiresAt ISO string to get expiry time
    const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : Date.now() + 600 * 1000;

    const session = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      user: {
        id: tokens.userId,
        email: userInfo?.email ?? '',
        displayName,
        role: isAdmin ? 'admin' : 'user',
        isAdmin,
      },
    };

    // Determine redirect based on admin status or stored redirect
    let finalRedirect = redirectTo;
    if (isAdmin && redirectTo === '/user') {
      finalRedirect = '/admin';
    }

    // Create response with redirect
    const redirectUrl = new URL(finalRedirect, APP_URL);
    const response = NextResponse.redirect(redirectUrl.toString());

    // Set signed session cookie (signed to prevent tampering)
    response.cookies.set(SESSION_COOKIE, signSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Clear OAuth cookies
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(VERIFIER_COOKIE);
    response.cookies.delete(REDIRECT_COOKIE);

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    const errorUrl = new URL('/login', APP_URL);
    errorUrl.searchParams.set('error', 'An unexpected error occurred');
    return NextResponse.redirect(errorUrl.toString());
  }
}
