import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_URL, SESSION_COOKIE } from '@/lib/env';
import { verifySession } from '@/lib/auth';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  
  if (!sessionCookie) {
    return null;
  }
  
  const session = verifySession(sessionCookie);
  if (!session?.accessToken) {
    return null;
  }
  
  return {
    'Authorization': `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * GET /api/admin/sso/connections
 * List all SSO connections (proxied to backend)
 */
export async function GET() {
  const headers = await getAuthHeaders();
  
  if (!headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/v1/sso/connections`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch SSO connections:', error);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}

/**
 * POST /api/admin/sso/connections
 * Create a new SSO connection (proxied to backend)
 */
export async function POST(request: Request) {
  const headers = await getAuthHeaders();
  
  if (!headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/v1/sso/connections`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to create SSO connection:', error);
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}
