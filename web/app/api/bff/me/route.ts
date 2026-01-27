import { NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/me
 * Get current authenticated user info
 */
export async function GET() {
  const result = await bffFetch('/v1/auth/me');
  return NextResponse.json(result, { status: result.status });
}
