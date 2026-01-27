import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';
import { API_URL, APP_URL, SESSION_COOKIE } from '@/lib/env';

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);

  if (sessionCookie?.value) {
    // Parse the signed session cookie properly
    const session = verifySession(sessionCookie.value);

    if (session?.accessToken) {
      // Call backend logout endpoint to revoke session
      await fetch(`${API_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ all_devices: false }),
      }).catch(() => {
        // Ignore errors - we'll clear the cookie anyway
      });
    }
  }

  // Redirect to home page
  const response = NextResponse.redirect(new URL('/', APP_URL));

  // Clear session cookie
  response.cookies.delete(SESSION_COOKIE);

  return response;
}

// Also handle GET for simple logout links
export async function GET(request: NextRequest) {
  return POST(request);
}
