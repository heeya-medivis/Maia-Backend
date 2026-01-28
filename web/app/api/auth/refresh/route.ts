import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, API_URL, APP_URL, CLIENT_ID } from '@/lib/env';
import { signSession, verifySession } from '@/lib/auth';

/**
 * GET /api/auth/refresh
 *
 * Refreshes the access token using the refresh token stored in the session cookie.
 * This is a Route Handler, so it CAN set cookies (unlike Server Components).
 *
 * On success: Updates the session cookie with new tokens and redirects to referer or /user
 * On failure: Clears the session and redirects to /login
 */
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const referer = request.headers.get('referer');

  // Determine where to redirect after refresh
  let redirectTo = '/user';
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      // Only use referer if it's from our app
      if (refererUrl.origin === APP_URL) {
        redirectTo = refererUrl.pathname + refererUrl.search;
      }
    } catch {
      // Invalid referer URL, use default
    }
  }

  if (!sessionCookie) {
    // No session, redirect to login
    return NextResponse.redirect(new URL('/login', APP_URL));
  }

  const session = verifySession(sessionCookie);
  if (!session?.refreshToken) {
    // Invalid session or no refresh token, redirect to login
    const response = NextResponse.redirect(new URL('/login', APP_URL));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  try {
    // Call the OAuth token endpoint with refresh_token grant
    const tokenResponse = await fetch(`${API_URL}/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
        client_id: CLIENT_ID,
      }),
    });

    if (!tokenResponse.ok) {
      // Refresh failed, session is no longer valid
      console.error('Token refresh failed:', await tokenResponse.text().catch(() => 'unknown error'));
      const response = NextResponse.redirect(new URL('/login', APP_URL));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    const tokens = await tokenResponse.json();

    // Fetch user details from /v1/auth/me
    const meResponse = await fetch(`${API_URL}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!meResponse.ok) {
      console.error('Failed to fetch user info after refresh');
      const response = NextResponse.redirect(new URL('/login', APP_URL));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    const meData = await meResponse.json();
    
    // The /v1/auth/me endpoint returns { user: { id, email, firstName, lastName, isAdmin, ... }, devices: [...] }
    const userInfo = meData.user;

    // Create session object with isAdmin from the response
    const isAdmin = userInfo?.isAdmin === true;
    const displayName = userInfo?.firstName && userInfo?.lastName 
      ? `${userInfo.firstName} ${userInfo.lastName}` 
      : userInfo?.firstName || userInfo?.email?.split('@')[0] || '';

    // Create new session object
    const newSession = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
      user: {
        id: tokens.user_id,
        email: userInfo?.email ?? '',
        displayName,
        role: isAdmin ? 'admin' : 'user',
        isAdmin,
      },
    };

    // Redirect back to where the user was
    const response = NextResponse.redirect(new URL(redirectTo, APP_URL));

    // Update the session cookie with new tokens
    response.cookies.set(SESSION_COOKIE, signSession(newSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    const response = NextResponse.redirect(new URL('/login', APP_URL));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}
