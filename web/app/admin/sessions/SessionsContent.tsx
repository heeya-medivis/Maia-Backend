'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Badge, Button } from '@/components/ui';
import {
  api,
  useApi,
  OverallUsageStats,
  UserUsageStats,
  OrganizationUsageStats,
} from '@/lib/api-client';
import {
  Users,
  Building2,
  MessageSquare,
  Zap,
  RefreshCw,
  Loader2,
  Calendar,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

type ViewType = 'by-user' | 'by-organization';
type TimeRange = 'all' | 'today' | '7days' | '30days' | 'custom';

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function getDateRange(range: TimeRange, customStart?: string, customEnd?: string) {
  if (range === 'custom' && customStart) {
    return {
      startDate: customStart,
      endDate: customEnd || undefined,
    };
  }

  if (range === 'all') return {};

  const now = new Date();
  const startDate = new Date();

  if (range === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === '7days') {
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === '30days') {
    startDate.setDate(now.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
  }

  return { startDate: startDate.toISOString() };
}

interface UserRowProps {
  user: UserUsageStats;
  rank: number;
  onViewDetail: (userId: string) => void;
}

function UserRow({ user, rank, onViewDetail }: UserRowProps) {
  const [expanded, setExpanded] = useState(false);
  const totalChatTokens = user.chatInputTokens + user.chatOutputTokens;

  return (
    <>
      <tr className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
        <td className="p-4 text-center text-[var(--muted)]">{rank}</td>
        <td className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-left hover:text-[var(--accent)] transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <div>
              <p className="font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-[var(--muted)]">{user.email}</p>
            </div>
          </button>
        </td>
        <td className="p-4 text-sm">{user.organization || <span className="text-[var(--muted)]">-</span>}</td>
        <td className="p-4 text-sm text-center">{user.chatSessionCount}</td>
        <td className="p-4 text-sm font-mono text-right">{formatNumber(user.totalTokens)}</td>
        <td className="p-4 text-center">
          <button
            onClick={() => onViewDetail(user.userId)}
            className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
            title="View Details"
          >
            <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--card-hover)]">
          <td colSpan={6} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-[var(--muted)] text-xs mb-1">Chat Input Tokens</p>
                <p className="font-mono">{formatNumber(user.chatInputTokens)}</p>
              </div>
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-[var(--muted)] text-xs mb-1">Chat Output Tokens</p>
                <p className="font-mono">{formatNumber(user.chatOutputTokens)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-4 text-xs text-[var(--muted)]">
                <span>Total Chat: <span className="font-mono text-white">{formatNumber(totalChatTokens)}</span></span>
              </div>
              <Button
                onClick={() => onViewDetail(user.userId)}
                variant="secondary"
                size="sm"
              >
                <ExternalLink className="w-3 h-3 mr-2" />
                View Charts
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface OrgRowProps {
  org: OrganizationUsageStats;
  rank: number;
  onViewDetail: (orgName: string) => void;
}

function OrgRow({ org, rank, onViewDetail }: OrgRowProps) {
  const [expanded, setExpanded] = useState(false);
  const totalChatTokens = org.chatInputTokens + org.chatOutputTokens;

  return (
    <>
      <tr className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
        <td className="p-4 text-center text-[var(--muted)]">{rank}</td>
        <td className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-left hover:text-[var(--accent)] transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="font-medium">{org.organization}</span>
          </button>
        </td>
        <td className="p-4 text-sm text-center">{org.userCount}</td>
        <td className="p-4 text-sm text-center">{org.chatSessionCount}</td>
        <td className="p-4 text-sm font-mono text-right">{formatNumber(org.totalTokens)}</td>
        <td className="p-4 text-center">
          <button
            onClick={() => onViewDetail(org.organization)}
            className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
            title="View Details"
          >
            <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--card-hover)]">
          <td colSpan={6} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-[var(--muted)] text-xs mb-1">Chat Input Tokens</p>
                <p className="font-mono">{formatNumber(org.chatInputTokens)}</p>
              </div>
              <div className="p-3 bg-[var(--card)] rounded-lg">
                <p className="text-[var(--muted)] text-xs mb-1">Chat Output Tokens</p>
                <p className="font-mono">{formatNumber(org.chatOutputTokens)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-4 text-xs text-[var(--muted)]">
                <span>Total Chat: <span className="font-mono text-white">{formatNumber(totalChatTokens)}</span></span>
                <span>Avg per User: <span className="font-mono text-white">{formatNumber(Math.round(org.totalTokens / org.userCount))}</span></span>
              </div>
              <Button
                onClick={() => onViewDetail(org.organization)}
                variant="secondary"
                size="sm"
              >
                <ExternalLink className="w-3 h-3 mr-2" />
                View Charts
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function SessionsContent() {
  const router = useRouter();
  const [viewType, setViewType] = useState<ViewType>('by-user');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const dateParams = useMemo(
    () => getDateRange(timeRange, customStartDate, customEndDate),
    [timeRange, customStartDate, customEndDate]
  );

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useApi(() => api.getAdminUsageStats(dateParams), [dateParams]);

  const {
    data: userStats,
    isLoading: userStatsLoading,
    refetch: refetchUserStats,
  } = useApi(() => api.getAdminUsageByUser(dateParams), [dateParams]);

  const {
    data: orgStats,
    isLoading: orgStatsLoading,
    refetch: refetchOrgStats,
  } = useApi(() => api.getAdminUsageByOrganization(dateParams), [dateParams]);

  const isLoading = statsLoading || userStatsLoading || orgStatsLoading;

  const refetch = () => {
    refetchStats();
    refetchUserStats();
    refetchOrgStats();
  };

  const handleViewUserDetail = (userId: string) => {
    router.push(`/admin/sessions/user/${userId}`);
  };

  const handleViewOrgDetail = (orgName: string) => {
    router.push(`/admin/sessions/organization/${encodeURIComponent(orgName)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[var(--accent)]" />
            Usage Analytics
          </h1>
          <p className="text-[var(--muted)]">Monitor token usage across all users and organizations</p>
        </div>
        <Button onClick={refetch} variant="secondary" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="h-16 bg-[var(--card-hover)] rounded" />
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Total Users</p>
                <p className="text-xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Organizations</p>
                <p className="text-xl font-bold">{stats.totalOrganizations}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--muted)]">Chat Sessions</p>
                <p className="text-xl font-bold">{stats.totalChatSessions}</p>
                {stats.activeChatSessions > 0 && (
                  <p className="text-xs text-green-400">{stats.activeChatSessions} active</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Token Summary */}
      {stats && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-medium">Token Usage Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-[var(--card-hover)] rounded-lg">
              <p className="text-xs text-[var(--muted)] mb-1">Chat Input</p>
              <p className="text-lg font-bold font-mono">{formatNumber(stats.totalChatInputTokens)}</p>
            </div>
            <div className="p-3 bg-[var(--card-hover)] rounded-lg">
              <p className="text-xs text-[var(--muted)] mb-1">Chat Output</p>
              <p className="text-lg font-bold font-mono">{formatNumber(stats.totalChatOutputTokens)}</p>
            </div>
            <div className="p-3 bg-[var(--accent-muted)] rounded-lg border border-[var(--accent)]">
              <p className="text-xs text-[var(--muted)] mb-1">Total Tokens</p>
              <p className="text-lg font-bold font-mono text-[var(--accent)]">{formatNumber(stats.totalTokens)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters and View Toggle */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Time Range */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Calendar className="w-4 h-4" />
              Time Range
            </span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 text-sm bg-[var(--card-hover)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
            {timeRange === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 text-sm bg-[var(--card-hover)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 text-sm bg-[var(--card-hover)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
            <button
              onClick={() => setViewType('by-user')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                viewType === 'by-user'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card-hover)] text-[var(--muted)] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              By User
            </button>
            <button
              onClick={() => setViewType('by-organization')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                viewType === 'by-organization'
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card-hover)] text-[var(--muted)] hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              By Organization
            </button>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : viewType === 'by-user' ? (
          userStats && userStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--muted)]">
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Organization</th>
                    <th className="p-4 text-center">Chat Sessions</th>
                    <th className="p-4 text-right">Total Tokens</th>
                    <th className="p-4 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {userStats.map((user, index) => (
                    <UserRow key={user.userId} user={user} rank={index + 1} onViewDetail={handleViewUserDetail} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-[var(--muted)]">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No usage data available</p>
              <p className="text-sm mt-2">Usage will appear here when users start using MAIA</p>
            </div>
          )
        ) : orgStats && orgStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--muted)]">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Organization</th>
                  <th className="p-4 text-center">Users</th>
                  <th className="p-4 text-center">Chat Sessions</th>

                  <th className="p-4 text-right">Total Tokens</th>
                  <th className="p-4 w-16 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {orgStats.map((org, index) => (
                  <OrgRow key={org.organization} org={org} rank={index + 1} onViewDetail={handleViewOrgDetail} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-[var(--muted)]">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No organization data available</p>
            <p className="text-sm mt-2">Usage will appear here when users start using MAIA</p>
          </div>
        )}
      </Card>
    </div>
  );
}
