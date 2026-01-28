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

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/sso/connections/[id]
 * Get a single SSO connection
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const headers = await getAuthHeaders();
  
  if (!headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/v1/sso/connections/${id}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch SSO connection:', error);
    return NextResponse.json({ error: 'Failed to fetch connection' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/sso/connections/[id]
 * Update an SSO connection
 */
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const headers = await getAuthHeaders();
  
  if (!headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/v1/sso/connections/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to update SSO connection:', error);
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/sso/connections/[id]
 * Delete an SSO connection
 */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const headers = await getAuthHeaders();
  
  if (!headers) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_URL}/v1/sso/connections/${id}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to delete SSO connection:', error);
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 });
  }
}
