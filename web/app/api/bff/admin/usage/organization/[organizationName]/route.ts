import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/admin/usage/organization/[organizationName]
 * Get detailed usage data for a specific organization (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationName: string }> }
) {
  const { organizationName } = await params;
  const path = `/api/admin/usage/organization/${encodeURIComponent(organizationName)}`;

  const result = await bffFetch(path);
  return NextResponse.json(result, { status: result.status });
}
