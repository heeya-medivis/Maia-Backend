import { NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/admin/users
 * List all users (admin only)
 */
export async function GET() {
  const result = await bffFetch('/api/admin/users');
  return NextResponse.json(result, { status: result.status });
}
