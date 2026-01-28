import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bff/admin/maia/models/:id
 * Get a single model with relations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await bffFetch(`/api/admin/maia/models/${id}`);
  return NextResponse.json(result, { status: result.status });
}

/**
 * PUT /api/bff/admin/maia/models/:id
 * Update a model
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const result = await bffFetch(`/api/admin/maia/models/${id}`, {
    method: 'PUT',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}

/**
 * DELETE /api/bff/admin/maia/models/:id
 * Delete a model
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const result = await bffFetch(`/api/admin/maia/models/${id}`, {
    method: 'DELETE',
  });

  // 204 No Content responses cannot have a body
  if (result.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(result, { status: result.status });
}
