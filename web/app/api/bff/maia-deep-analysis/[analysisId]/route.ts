import { NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ analysisId: string }>;
}

/**
 * GET /api/bff/maia-deep-analysis/:analysisId
 * Get a specific deep analysis with images
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { analysisId } = await params;
  const result = await bffFetch(`/api/maia-deep-analysis/${analysisId}`);
  return NextResponse.json(result, { status: result.status });
}
