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

// =============================================================================
// MAIA Types
// =============================================================================

export type ModelCategory = 'balanced' | 'thinking' | 'live';
export type Provider = 'invalid' | 'gcloud' | 'openai' | 'self';
export type HostProvider = 'invalid' | 'aws_ec2';
export type PromptType = 'invalid' | 'system_prompt' | 'analysis_prompt';

export interface MaiaModel {
  id: string;
  modelName: string;
  modelDisplayName: string;
  modelCategory: ModelCategory;
  provider: Provider;
  modelPriority: number | null;
  pricing: number;
  isActive: boolean;
  createdDateTime: string;
  modifiedDateTime: string | null;
  modifiedByName: string | null;
}

export interface MaiaPrompt {
  id: string;
  type: PromptType;
  content: string;
  maiaModelId: string;
  isActive: boolean;
  createdDateTime: string;
}

export interface MaiaHost {
  id: string;
  hostProvider: HostProvider;
  serverIp: string;
  maiaModelId: string;
}

export interface MaiaModelWithRelations extends MaiaModel {
  prompts: MaiaPrompt[];
  host: MaiaHost | null;
}

export interface CreateMaiaModelInput {
  modelName: string;
  modelDisplayName: string;
  modelCategory: number; // 0=balanced, 1=thinking, 2=live
  provider: number; // 0=invalid, 1=gcloud, 2=openai, 3=self
  modelPriority?: number;
  pricing?: string;
  isActive?: boolean;
  hostProvider?: number;
  serverIp?: string;
}

export interface UpdateMaiaModelInput extends Partial<CreateMaiaModelInput> {}

export interface MaiaPromptInput {
  type: number; // 1=system_prompt, 2=analysis_prompt
  content: string;
  isActive: boolean;
}

export interface MaiaEnumOption {
  value: number;
  label: string;
  dbValue: string;
}

export interface MaiaOptions {
  categories: MaiaEnumOption[];
  providers: MaiaEnumOption[];
  hostProviders: MaiaEnumOption[];
}

// User access types
export interface MaiaUserAccess {
  accessId: string;
  userId: string;
  name: string;
  email: string;
}

export interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

// Session types
export interface MaiaSession {
  id: string;
  userId: string;
  providerSessionId: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  totalInputTextTokens: number;
  totalInputImageTokens: number;
  totalInputAudioTokens: number;
  totalInputTextCachedTokens: number;
  totalInputImageCachedTokens: number;
  totalInputAudioCachedTokens: number;
  totalOutputTextTokens: number;
  totalOutputImageTokens: number;
  totalOutputAudioTokens: number;
  totalOutputReasoningTokens: number;
  createdAt: string;
}

export interface MaiaSessionTurn {
  id: string;
  sessionId: string;
  requestTime: string;
  responseTime: string;
  inputTextTokens: number;
  inputImageTokens: number;
  inputAudioTokens: number;
  inputTextCachedTokens: number;
  inputImageCachedTokens: number;
  inputAudioCachedTokens: number;
  outputTextTokens: number;
  outputImageTokens: number;
  outputAudioTokens: number;
  outputReasoningTokens: number;
  createdAt: string;
}

export interface MaiaSessionWithTurns {
  session: MaiaSession;
  turns: MaiaSessionTurn[];
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
// Admin User Types
// =============================================================================

export type OrganizationRole = 'manager' | 'member';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organization: string | null;
  role: OrganizationRole | null;
  isAdmin: boolean;
  lastLoginWeb: string | null;
  lastLoginApp: string | null;
  createdDateTime: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  organization?: string | null;
  role?: OrganizationRole | null;
  isAdmin?: boolean;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}

// =============================================================================
// Admin Usage Types
// =============================================================================

export interface OverallUsageStats {
  totalUsers: number;
  totalOrganizations: number;
  totalChatSessions: number;
  totalChatInputTokens: number;
  totalChatOutputTokens: number;
  totalTokens: number;
  activeChatSessions: number;
}

export interface UserUsageStats {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  chatSessionCount: number;
  chatInputTokens: number;
  chatOutputTokens: number;
  totalTokens: number;
}

export interface OrganizationUsageStats {
  organization: string;
  userCount: number;
  chatSessionCount: number;
  chatInputTokens: number;
  chatOutputTokens: number;
  totalTokens: number;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface UserDetailInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
}

export interface UserDetailData {
  user: UserDetailInfo;
  chatSessions: MaiaSession[];
}

export interface OrgUserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface OrganizationDetailData {
  organization: string;
  users: OrgUserInfo[];
  chatSessions: MaiaSession[];
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

  async updateProfile(data: UpdateProfileData): Promise<MeResponse> {
    await this.request<{ user: MeResponse['user'] }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    // Re-fetch full profile to get devices etc.
    return this.getMe();
  }

  // ===========================================================================
  // Users Admin Endpoints
  // ===========================================================================

  async getUsers(): Promise<AdminUser[]> {
    const response = await this.request<AdminUser[]>('/admin/users');
    return response.data ?? [];
  }

  async updateUser(id: string, data: UpdateUserData): Promise<AdminUser> {
    const response = await this.request<AdminUser>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  // ===========================================================================
  // MAIA Admin Endpoints
  // ===========================================================================

  async getMaiaOptions(): Promise<MaiaOptions> {
    const response = await this.request<MaiaOptions>('/admin/maia/options');
    return response.data!;
  }

  async getMaiaModels(): Promise<MaiaModel[]> {
    const response = await this.request<MaiaModel[]>('/admin/maia/models');
    return response.data ?? [];
  }

  async getMaiaModel(id: string): Promise<MaiaModelWithRelations> {
    const response = await this.request<MaiaModelWithRelations>(`/admin/maia/models/${id}`);
    return response.data!;
  }

  async createMaiaModel(data: CreateMaiaModelInput): Promise<MaiaModel> {
    const response = await this.request<MaiaModel>('/admin/maia/models', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async updateMaiaModel(id: string, data: UpdateMaiaModelInput): Promise<MaiaModel> {
    const response = await this.request<MaiaModel>(`/admin/maia/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async deleteMaiaModel(id: string): Promise<void> {
    await this.request(`/admin/maia/models/${id}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // MAIA User Access Endpoints
  // ===========================================================================

  async getUsersWithAccess(modelId: string): Promise<MaiaUserAccess[]> {
    const response = await this.request<MaiaUserAccess[]>(`/admin/maia/models/${modelId}/users`);
    return response.data ?? [];
  }

  async getAvailableUsers(modelId: string): Promise<AvailableUser[]> {
    const response = await this.request<AvailableUser[]>(`/admin/maia/models/${modelId}/available-users`);
    return response.data ?? [];
  }

  async manageUserAccess(modelId: string, userId: string, grantAccess: boolean): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>(`/admin/maia/models/${modelId}/access`, {
      method: 'POST',
      body: JSON.stringify({ userId, grantAccess }),
    });
    return response.data!;
  }

  // ===========================================================================
  // MAIA Prompt Endpoints
  // ===========================================================================

  async createPrompt(modelId: string, data: MaiaPromptInput): Promise<MaiaPrompt> {
    const response = await this.request<MaiaPrompt>(`/admin/maia/models/${modelId}/prompts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async updatePrompt(promptId: string, data: MaiaPromptInput): Promise<MaiaPrompt> {
    const response = await this.request<MaiaPrompt>(`/admin/maia/prompts/${promptId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data!;
  }

  async deletePrompt(promptId: string): Promise<void> {
    await this.request(`/admin/maia/prompts/${promptId}`, {
      method: 'DELETE',
    });
  }

  // ===========================================================================
  // Admin Usage Endpoints
  // ===========================================================================

  async getAdminUsageStats(params?: DateRangeParams): Promise<OverallUsageStats> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    const queryString = queryParams.toString();
    const path = `/admin/usage/stats${queryString ? `?${queryString}` : ''}`;
    const response = await this.request<OverallUsageStats>(path);
    return response.data!;
  }

  async getAdminUsageByUser(params?: DateRangeParams): Promise<UserUsageStats[]> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    const queryString = queryParams.toString();
    const path = `/admin/usage/by-user${queryString ? `?${queryString}` : ''}`;
    const response = await this.request<UserUsageStats[]>(path);
    return response.data ?? [];
  }

  async getAdminUsageByOrganization(params?: DateRangeParams): Promise<OrganizationUsageStats[]> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    const queryString = queryParams.toString();
    const path = `/admin/usage/by-organization${queryString ? `?${queryString}` : ''}`;
    const response = await this.request<OrganizationUsageStats[]>(path);
    return response.data ?? [];
  }

  async getAdminUserDetail(userId: string): Promise<UserDetailData> {
    const response = await this.request<UserDetailData>(`/admin/usage/user/${userId}`);
    return response.data!;
  }

  async getAdminOrganizationDetail(organizationName: string): Promise<OrganizationDetailData> {
    const response = await this.request<OrganizationDetailData>(`/admin/usage/organization/${encodeURIComponent(organizationName)}`);
    return response.data!;
  }

  // ===========================================================================
  // MAIA Session Endpoints
  // ===========================================================================

  async getSessions(): Promise<MaiaSession[]> {
    const response = await this.request<MaiaSession[]>('/maia/session');
    return response.data ?? [];
  }

  async getSession(sessionId: string): Promise<MaiaSessionWithTurns> {
    const response = await this.request<MaiaSessionWithTurns>(`/maia/session/${sessionId}`);
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
