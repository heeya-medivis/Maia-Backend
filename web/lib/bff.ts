/**
 * BFF (Backend-For-Frontend) Utilities
 *
 * This module provides authenticated API calls from Next.js server components
 * and route handlers to the backend API. It reads the session cookie and
 * injects the Bearer token when making requests.
 *
 * This solves the critical auth issue where browser API clients can only send
 * cookies but cannot attach Bearer tokens stored in httpOnly cookies.
 */

import { getSession } from './auth';
import { API_URL } from './env';

export interface BffRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  searchParams?: Record<string, string>;
}

export interface BffResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Make an authenticated request to the backend API from a server component/route handler.
 * Automatically injects the Bearer token from the session cookie.
 */
export async function bffFetch<T>(
  endpoint: string,
  options: BffRequestOptions = {}
): Promise<BffResponse<T>> {
  const session = await getSession();

  if (!session?.accessToken) {
    return { data: null, error: 'Not authenticated', status: 401 };
  }

  // If access token is expired, return 401 so client can trigger refresh
  if (session.accessTokenExpired) {
    return { data: null, error: 'Token expired', status: 401 };
  }

  const url = new URL(endpoint, API_URL);
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  try {
    const response = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      // Don't cache authenticated requests
      cache: 'no-store',
    });

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    let data: { data?: T; error?: { message?: string; code?: string }; message?: string | string[]; meta?: BffResponse<T>['meta'] } | any = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Response wasn't JSON
        data = null;
      }
    }

    if (!response.ok) {
      return {
        data: null,
        error: data?.error?.message || `Request failed with status ${response.status}`,
        status: response.status
      };
    }

    // Handle paginated responses: { data: { items: [...], meta: {...} } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const innerData = data?.data as any;
    if (innerData?.items !== undefined && innerData?.meta !== undefined) {
      return {
        data: innerData.items as T,
        error: null,
        status: response.status,
        meta: innerData.meta
      };
    }

    // Handle wrapped single objects: { data: {...} }
    const responseData = data?.data !== undefined ? data.data : (data as unknown as T);

    return {
      data: responseData,
      error: null,
      status: response.status,
      meta: data?.meta
    };
  } catch (error) {
    console.error('[BFF] Request error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Network error',
      status: 500
    };
  }
}
