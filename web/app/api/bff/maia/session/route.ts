import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/maia/session
 * Get all sessions for current user
 */
export async function GET() {
  const result = await bffFetch('/api/maia/session');
  return NextResponse.json(result, { status: result.status });
}

/**
 * POST /api/bff/maia/session
 * Create a new session
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await bffFetch('/api/maia/session', {
    method: 'POST',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
