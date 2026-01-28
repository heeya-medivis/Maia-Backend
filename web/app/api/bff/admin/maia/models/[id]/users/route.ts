import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bff/admin/maia/models/:id/users
 * Get users who have access to this model
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await bffFetch(`/api/admin/maia/models/${id}/users`);
  return NextResponse.json(result, { status: result.status });
}
