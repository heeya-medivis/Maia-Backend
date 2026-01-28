import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/bff/auth/magic-link
 * Request a magic link to be sent to the user's email
 *
 * Body:
 * - email: The user's email address
 * - redirect_uri: Where to redirect after authentication (optional, defaults to /user)
 */
export async function POST(request: NextRequest) {
  // Parse body to avoid unused variable warning
  await request.json();

  // Return 501 not implemented (mock - magic link not available)
  return NextResponse.json(
    { 
      data: null, 
      error: { code: 'not_implemented', message: 'Magic link authentication is not yet implemented' }, 
      status: 501 
    }, 
    { status: 501 }
  );
}
