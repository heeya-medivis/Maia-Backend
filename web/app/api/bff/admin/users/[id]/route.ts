import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/bff/admin/users/:id
 * Update a user (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const result = await bffFetch(`/api/admin/users/${id}`, {
    method: 'PUT',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
