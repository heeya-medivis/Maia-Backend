import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/bff/maia-chat/:sessionId/turn
 * Create a turn with token usage
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const body = await request.json();
  const result = await bffFetch(`/api/maia-chat/${sessionId}/turn`, {
    method: 'POST',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
