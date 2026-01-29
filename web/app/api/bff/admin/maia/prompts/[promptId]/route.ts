import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ promptId: string }>;
}

/**
 * PUT /api/bff/admin/maia/prompts/:promptId
 * Update a prompt
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { promptId } = await params;
  const body = await request.json();
  const result = await bffFetch(`/api/admin/maia/prompts/${promptId}`, {
    method: 'PUT',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}

/**
 * DELETE /api/bff/admin/maia/prompts/:promptId
 * Delete a prompt
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { promptId } = await params;
  const result = await bffFetch(`/api/admin/maia/prompts/${promptId}`, {
    method: 'DELETE',
  });

  // 204 No Content responses cannot have a body
  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(result, { status: result.status });
}
