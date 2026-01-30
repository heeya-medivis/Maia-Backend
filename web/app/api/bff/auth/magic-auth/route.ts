import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/env';

/**
 * POST /api/bff/auth/magic-auth
 * Request a 6-digit verification code to be sent to the user's email
 *
 * Body:
 * - email: The user's email address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { 
          data: null, 
          error: { code: 'invalid_request', message: 'Email is required' }, 
          status: 400 
        }, 
        { status: 400 }
      );
    }

    // Call the API to send 6-digit code
    const response = await fetch(`${API_URL}/v1/auth/magic-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        clientId: 'maia-web',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          data: null, 
          error: { 
            code: 'magic_auth_failed', 
            message: data.message || 'Failed to send verification code' 
          }, 
          status: response.status 
        }, 
        { status: response.status }
      );
    }

    return NextResponse.json({
      data: { success: true, message: data.message },
      error: null,
      status: 200,
    });
  } catch (error) {
    console.error('Magic auth request error:', error);
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
