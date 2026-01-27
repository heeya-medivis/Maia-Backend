/**
 * API Client for Maia Backend
 *
 * Provides type-safe API calls through the BFF (Backend-For-Frontend) layer.
 * The BFF handles authentication by reading the session cookie and injecting
 * the Bearer token when calling the actual backend.
 */

// =============================================================================
// Types
// =============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// =============================================================================
// User Types
// =============================================================================

export interface MeResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
    emailVerified: boolean;
    isAdmin: boolean;
  };
  devices: Array<{
    id: string;
    name: string | null;
    deviceType: string | null;
    platform: string | null;
    lastActiveAt: string | null;
    isActive: boolean;
  }>;
  currentDeviceId: string | null;
}

// Legacy type for backwards compatibility
export interface CurrentUser {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isAdmin?: boolean;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
  membership: {
    role: string;
    scopes: string[];
  } | null;
  entitlements: Record<string, unknown>;
}

// =============================================================================
// BFF Response Format
// =============================================================================

interface BffResponse<T> {
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

// =============================================================================
// API Client Class
// =============================================================================

class ApiClient {
  /**
   * Make a request through the BFF layer.
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<BffResponse<T>> {
    const url = `/api/bff${path}`;

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle token refresh redirect
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/api/auth/refresh';
      }
      throw new ApiClientError('unauthorized', 'Session expired', 401);
    }

    const data: BffResponse<T> = await response.json();

    if (data.error) {
      throw new ApiClientError('api_error', data.error, data.status);
    }

    return data;
  }

  // ===========================================================================
  // Auth Endpoints
  // ===========================================================================

  async getCurrentUser(): Promise<CurrentUser> {
    const response = await this.request<MeResponse>('/me');
    const me = response.data!;
    
    // Transform MeResponse to CurrentUser for backwards compatibility
    return {
      user: {
        id: me.user.id,
        email: me.user.email,
        name: me.user.firstName && me.user.lastName 
          ? `${me.user.firstName} ${me.user.lastName}` 
          : me.user.firstName || me.user.email,
        role: me.user.isAdmin ? 'admin' : 'user',
        isAdmin: me.user.isAdmin,
      },
      tenant: null, // No tenant support yet
      membership: null, // No membership support yet
      entitlements: {},
    };
  }

  async getMe(): Promise<MeResponse> {
    const response = await this.request<MeResponse>('/me');
    return response.data!;
  }
}

// =============================================================================
// Export Singleton
// =============================================================================

export const api = new ApiClient();

// =============================================================================
// React Hooks for Data Fetching
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiClientError | null;
  refetch: () => Promise<void>;
}

interface UseApiOptions {
  enabled?: boolean;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiOptions = {}
): UseApiState<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<ApiClientError | null>(null);
  
  // Use ref to track if initial fetch has been done
  const hasFetched = useRef(false);
  // Store the fetcher in a ref to avoid dependency issues
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError('unknown', String(err), 500));
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled && !hasFetched.current) {
      hasFetched.current = true;
      refetch();
    } else if (!enabled) {
      setData(null);
      setIsLoading(false);
      setError(null);
      hasFetched.current = false;
    }
  }, [enabled, refetch]);

  // Reset hasFetched when deps change (for hooks that pass changing params)
  useEffect(() => {
    hasFetched.current = false;
    if (enabled) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return { data, isLoading, error, refetch };
}

// Convenience hooks
export function useCurrentUser() {
  return useApi(() => api.getCurrentUser(), []);
}
