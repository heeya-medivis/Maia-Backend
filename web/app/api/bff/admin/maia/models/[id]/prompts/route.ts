import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bff/admin/maia/models/:id/prompts
 * Create a new prompt for a model
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const result = await bffFetch(`/api/admin/maia/models/${id}/prompts`, {
    method: 'POST',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
