import { NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/bff/maia/session/:sessionId
 * Get a specific session with all turns
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { sessionId } = await params;
  const result = await bffFetch(`/api/maia/session/${sessionId}`);
  return NextResponse.json(result, { status: result.status });
}
