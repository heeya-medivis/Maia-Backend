import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/bff/maia-chat/:sessionId/end
 * End a chat session
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const result = await bffFetch(`/api/maia-chat/${sessionId}/end`, {
    method: 'POST',
  });
  return NextResponse.json(result, { status: result.status });
}
