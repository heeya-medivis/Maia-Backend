import { NextRequest, NextResponse } from 'next/server';
import { bffFetch } from '@/lib/bff';

/**
 * GET /api/bff/maia-chat
 * Get all chat sessions for current user
 */
export async function GET() {
  const result = await bffFetch('/api/maia-chat/sessions');
  return NextResponse.json(result, { status: result.status });
}

/**
 * POST /api/bff/maia-chat
 * Create a new chat session
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await bffFetch('/api/maia-chat', {
    method: 'POST',
    body,
  });
  return NextResponse.json(result, { status: result.status });
}
