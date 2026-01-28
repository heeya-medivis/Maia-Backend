import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/admin/maia/models
 * List all MAIA models
 */
export async function GET() {
  const result = await bffFetch('/api/admin/maia/models');
  return NextResponse.json(result, { status: result.status });
}

/**
 * POST /api/bff/admin/maia/models
 * Create a new MAIA model
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await bffFetch('/api/admin/maia/models', {
    method: 'POST',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
