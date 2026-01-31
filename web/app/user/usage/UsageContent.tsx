'use client';

import { useState, useMemo } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { api, useApi, MaiaSession } from '@/lib/api-client';
import { UsageChart } from '@/components/charts/UsageChart';
import {
  TrendingUp,
  Clock,
  Zap,
  MessageSquare,
  Calendar,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';

type TimeRange = 'today' | '7days';
type Metric = 'sessions' | 'tokens';

function getChatTotalTokens(session: MaiaSession): number {
  return (
    session.totalInputTextTokens +
    session.totalInputImageTokens +
    session.totalInputAudioTokens +
    session.totalOutputTextTokens +
    session.totalOutputImageTokens +
    session.totalOutputAudioTokens +
    session.totalOutputReasoningTokens
  );
}

export function UsageContent() {
  const { data: chatSessions, isLoading, error, refetch } = useApi(
    () => api.getSessions(),
    []
  );

  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [metric, setMetric] = useState<Metric>('sessions');

  // Filter chat sessions based on time range
  const filteredChatSessions = useMemo(() => {
    if (!chatSessions) return [];
    const cutoff = new Date();

    if (timeRange === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else {
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
    }

    return chatSessions.filter((s) => new Date(s.startTime) >= cutoff);
  }, [chatSessions, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSessions = filteredChatSessions.length;
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
      (sum, s) =>
        sum +
        s.totalOutputTextTokens +
        s.totalOutputImageTokens +
        s.totalOutputAudioTokens +
        s.totalOutputReasoningTokens,
      0
    );

    return {
      totalSessions,
      activeSessions,
      totalTokens: inputTokens + outputTokens,
      inputTokens,
      outputTokens,
    };
  }, [filteredChatSessions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[var(--accent)]" />
            MAIA Usage Analytics
          </h1>
          <p className="text-[var(--muted)]">Track your MAIA usage and token consumption</p>
        </div>
        <Button onClick={refetch} variant="secondary" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Chat Sessions</p>
              <p className="text-xl font-bold">{stats.totalSessions}</p>
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
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Input Tokens</p>
              <p className="text-xl font-bold">{stats.inputTokens.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--accent-muted)] rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Output Tokens</p>
              <p className="text-xl font-bold">{stats.outputTokens.toLocaleString()}</p>
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

        {isLoading ? (
          <div className="flex items-center justify-center h-[320px]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[320px] text-red-400">
            Error loading usage data: {error.message}
          </div>
        ) : (
          <UsageChart
            chatSessions={filteredChatSessions}
            timeRange={timeRange}
            metric={metric}
            height={320}
          />
        )}
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="font-medium mb-4">Recent Activity</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : filteredChatSessions.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)]">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No activity in this time period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChatSessions
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .slice(0, 5)
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
