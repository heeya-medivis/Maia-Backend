import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/bff/maia/session/:sessionId/end
 * End a session
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const result = await bffFetch(`/api/maia/session/${sessionId}/end`, {
    method: 'POST',
  });
  return NextResponse.json(result, { status: result.status });
}
