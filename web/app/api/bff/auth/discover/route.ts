import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/bff/auth/discover
 * Discover organization auth options by email domain
 * This is a public endpoint - no authentication required
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email as string;

    // Mock discovery response - return default auth options
    return NextResponse.json({
      data: {
        email,
        organization: null,
        authMethods: [
          {
            type: 'password',
            enabled: true,
            name: 'Email & Password'
          }
        ],
        requiresInvite: false
      },
      error: null,
      status: 200
    });
  } catch (error) {
    console.error('[BFF] Auth discover error:', error);
    return NextResponse.json(
      { error: { message: 'Discovery request failed' } },
      { status: 500 }
    );
  }
}
