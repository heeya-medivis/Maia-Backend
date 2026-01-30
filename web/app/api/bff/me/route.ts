import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/me
 * Get current authenticated user info
 */
export async function GET() {
  const result = await bffFetch('/v1/auth/me');
  return NextResponse.json(result, { status: result.status });
}

/**
 * PATCH /api/bff/me
 * Update current user profile (firstName, lastName)
 */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const result = await bffFetch('/users/me', {
    method: 'PATCH',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
