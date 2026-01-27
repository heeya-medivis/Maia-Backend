import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/bff/auth/invite/:token
 * Validate an invite token and return invite details
 * This is a public endpoint - no authentication required
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Consume params to avoid unused variable warnings
  await params;

  // Return 404 (mock - invite token not found)
  return NextResponse.json({ data: null, error: 'Not found', status: 404 }, { status: 404 });
}
