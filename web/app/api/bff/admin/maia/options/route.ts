import { NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

export interface MaiaOptions {
  categories: { value: number; label: string; dbValue: string }[];
  providers: { value: number; label: string; dbValue: string }[];
  hostProviders: { value: number; label: string; dbValue: string }[];
}

/**
 * GET /api/bff/admin/maia/options
 * Get MAIA enum options for forms
 */
export async function GET() {
  const result = await bffFetch<MaiaOptions>('/api/admin/maia/options');
  return NextResponse.json(result, { status: result.status });
}
