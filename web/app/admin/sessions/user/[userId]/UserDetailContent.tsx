'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Badge, Button } from '@/components/ui';
import { api, useApi, MaiaSession } from '@/lib/api-client';
import { UsageChart } from '@/components/charts/UsageChart';
import {
  ArrowLeft,
  User,
  Building2,
  MessageSquare,
  Zap,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  BarChart3,
  Mail,
} from 'lucide-react';

type TimeRange = 'today' | '7days';
type Metric = 'sessions' | 'tokens';

function getChatTotalTokens(session: MaiaSession): number {
  return (
    session.totalInputTextTokens +
    session.totalInputImageTokens +
    session.totalInputAudioTokens +
    session.totalOutputTextTokens +
    session.totalOutputAudioTokens
  );
}

interface UserDetailContentProps {
  userId: string;
}

export function UserDetailContent({ userId }: UserDetailContentProps) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [metric, setMetric] = useState<Metric>('tokens');

  const { data, isLoading, error, refetch } = useApi(
    () => api.getAdminUserDetail(userId),
    [userId]
  );

  // Filter sessions based on time range
  const filteredChatSessions = useMemo(() => {
    if (!data?.chatSessions) return [];
    const cutoff = new Date();

    if (timeRange === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else {
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
    }

    return data.chatSessions.filter((s) => new Date(s.startTime) >= cutoff);
  }, [data?.chatSessions, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const chatCount = filteredChatSessions.length;
    const activeSessions = filteredChatSessions.filter((s) => s.isActive).length;

    const inputTokens = filteredChatSessions.reduce(
      (sum, s) =>
        sum +
        s.totalInputTextTokens +
        s.totalInputImageTokens +
        s.totalInputAudioTokens,
      0
    );
    const outputTokens = filteredChatSessions.reduce(
      (sum, s) => sum + s.totalOutputTextTokens + s.totalOutputAudioTokens,
      0
    );

    return {
      chatCount,
      activeSessions,
      totalTokens: inputTokens + outputTokens,
      inputTokens,
      outputTokens,
    };
  }, [filteredChatSessions]);

  // All-time stats
  const allTimeStats = useMemo(() => {
    if (!data) return { chatCount: 0, totalTokens: 0 };

    const chatTokens = data.chatSessions.reduce((sum, s) => sum + getChatTotalTokens(s), 0);

    return {
      chatCount: data.chatSessions.length,
      totalTokens: chatTokens,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error loading user data: {error?.message || 'User not found'}</p>
        <Button onClick={() => router.back()} variant="secondary" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="w-6 h-6 text-[var(--accent)]" />
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-4 text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {user.email}
              </span>
              {user.organization && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {user.organization}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button onClick={refetch} variant="secondary" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* All-time Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Total Chat Sessions</p>
              <p className="text-xl font-bold">{allTimeStats.chatCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Active Now</p>
              <p className="text-xl font-bold">{stats.activeSessions}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent-muted)] rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Total Tokens</p>
              <p className="text-xl font-bold">{allTimeStats.totalTokens.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toggle Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Time Range Toggle */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Calendar className="w-4 h-4" />
              Time Range
            </span>
            <div className="relative flex rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--card-hover)]">
              <div
                className="absolute top-0 bottom-0 w-1/2 bg-blue-600 rounded-md transition-transform duration-300 ease-out"
                style={{ transform: timeRange === 'today' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              <button
                onClick={() => setTimeRange('today')}
                className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  timeRange === 'today' ? 'text-white' : 'text-[var(--muted)] hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-1" />
                Today
              </button>
              <button
                onClick={() => setTimeRange('7days')}
                className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  timeRange === '7days' ? 'text-white' : 'text-[var(--muted)] hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                7 Days
              </button>
            </div>
          </div>

          {/* Metric Toggle */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <BarChart3 className="w-4 h-4" />
              Metric
            </span>
            <div className="relative flex rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--card-hover)]">
              <div
                className="absolute top-0 bottom-0 w-1/2 bg-green-600 rounded-md transition-transform duration-300 ease-out"
                style={{ transform: metric === 'sessions' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              <button
                onClick={() => setMetric('sessions')}
                className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  metric === 'sessions' ? 'text-white' : 'text-[var(--muted)] hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-1" />
                # Sessions
              </button>
              <button
                onClick={() => setMetric('tokens')}
                className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  metric === 'tokens' ? 'text-white' : 'text-[var(--muted)] hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 inline mr-1" />
                Tokens
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-medium">
            {metric === 'sessions' ? 'Sessions' : 'Token Usage'} Over Time
          </h2>
          <Badge variant="default">
            {timeRange === 'today' ? 'Hourly' : 'Daily'}
          </Badge>
        </div>

        <UsageChart
          chatSessions={filteredChatSessions}
          timeRange={timeRange}
          metric={metric}
          height={320}
        />
      </Card>

      {/* Period Stats */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">
          {timeRange === 'today' ? "Today's" : 'Last 7 Days'} Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 bg-[var(--card-hover)] rounded-lg">
            <p className="text-xs text-[var(--muted)] mb-1">Chat Sessions</p>
            <p className="text-lg font-bold">{stats.chatCount}</p>
          </div>
          <div className="p-3 bg-[var(--card-hover)] rounded-lg">
            <p className="text-xs text-[var(--muted)] mb-1">Input Tokens</p>
            <p className="text-lg font-bold font-mono">{stats.inputTokens.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-[var(--card-hover)] rounded-lg">
            <p className="text-xs text-[var(--muted)] mb-1">Output Tokens</p>
            <p className="text-lg font-bold font-mono">{stats.outputTokens.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="font-medium mb-4">Recent Activity</h2>
        {filteredChatSessions.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)]">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No activity in this time period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChatSessions
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .slice(0, 10)
              .map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-[var(--card-hover)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        session.isActive ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(session.startTime).toLocaleString()}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {session.isActive ? 'Active Chat' : 'Chat Session'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">
                      {getChatTotalTokens(session).toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </div>
  );
}
