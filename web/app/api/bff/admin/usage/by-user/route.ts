import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/admin/usage/by-user
 * Get usage statistics by user (admin only)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set('startDate', startDate);
  if (endDate) queryParams.set('endDate', endDate);

  const queryString = queryParams.toString();
  const path = `/api/admin/usage/by-user${queryString ? `?${queryString}` : ''}`;

  const result = await bffFetch(path);
  return NextResponse.json(result, { status: result.status });
}
