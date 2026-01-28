import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bff/admin/maia/models/:id/access
 * Grant or revoke user access to a model
 * Body: { userId: string, grantAccess: boolean }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const result = await bffFetch(`/api/admin/maia/models/${id}/access`, {
    method: 'POST',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
