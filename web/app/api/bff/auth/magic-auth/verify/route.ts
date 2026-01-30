import { NextRequest, NextResponse } from 'next/server';
import { signSession } from '@/lib/auth';
import { API_URL, SESSION_COOKIE } from '@/lib/env';

/**
 * POST /api/bff/auth/magic-auth/verify
 * Verify the 6-digit code and authenticate the user
 *
 * Body:
 * - email: The user's email address
 * - code: The 6-digit verification code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { 
          data: null, 
          error: { code: 'invalid_request', message: 'Email and code are required' }, 
          status: 400 
        }, 
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { 
          data: null, 
          error: { code: 'invalid_code', message: 'Please enter a valid 6-digit code' }, 
          status: 400 
        }, 
        { status: 400 }
      );
    }

    // Call the API to verify the code
    const response = await fetch(`${API_URL}/v1/auth/magic-auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        code,
        clientId: 'maia-web',
        devicePlatform: 'web',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          data: null, 
          error: { 
            code: 'verification_failed', 
            message: data.message || 'Invalid or expired code' 
          }, 
          status: response.status 
        }, 
        { status: response.status }
      );
    }

    // Fetch user info using the new access token
    const meResponse = await fetch(`${API_URL}/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${data.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!meResponse.ok) {
      console.error('Failed to fetch user info after magic auth');
      return NextResponse.json(
        { 
          data: null, 
          error: { code: 'user_fetch_failed', message: 'Failed to get user information' }, 
          status: 500 
        }, 
        { status: 500 }
      );
    }

    const meData = await meResponse.json();
    const userInfo = meData.user;

    // Create session object matching OAuth callback format
    const isAdmin = userInfo?.isAdmin === true;
    const displayName = userInfo?.firstName && userInfo?.lastName 
      ? `${userInfo.firstName} ${userInfo.lastName}` 
      : userInfo?.firstName || email.split('@')[0] || '';

    const expiresAt = data.expiresAt 
      ? new Date(data.expiresAt).getTime() 
      : Date.now() + 24 * 60 * 60 * 1000; // 24 hours default

    const session = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt,
      user: {
        id: userInfo?.id ?? '',
        email: userInfo?.email ?? email,
        displayName,
        role: isAdmin ? 'admin' : 'user',
        isAdmin,
      },
    };

    // Create JSON response
    const jsonResponse = NextResponse.json({
      data: { 
        success: true,
        isAdmin,
      },
      error: null,
      status: 200,
    });

    // Set signed session cookie on the response (same pattern as OAuth callback)
    jsonResponse.cookies.set(SESSION_COOKIE, signSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return jsonResponse;
  } catch (error) {
    console.error('Magic auth verification error:', error);
    return NextResponse.json(
      { 
        data: null, 
        error: { code: 'internal_error', message: 'An unexpected error occurred' }, 
        status: 500 
      }, 
      { status: 500 }
    );
  }
}
