import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/maia-deep-analysis
 * Get all deep analyses for current user
 */
export async function GET() {
  const result = await bffFetch('/api/maia-deep-analysis');
  return NextResponse.json(result, { status: result.status });
}

/**
 * POST /api/bff/maia-deep-analysis
 * Create a new deep analysis
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await bffFetch('/api/maia-deep-analysis', {
    method: 'POST',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
