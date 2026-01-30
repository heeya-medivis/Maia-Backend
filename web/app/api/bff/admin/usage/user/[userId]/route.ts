import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/admin/usage/user/[userId]
 * Get detailed usage data for a specific user (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const path = `/api/admin/usage/user/${userId}`;

  const result = await bffFetch(path);
  return NextResponse.json(result, { status: result.status });
}
