'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Badge, Button } from '@/components/ui';
import { api, useApi, MaiaChatSession, MaiaDeepAnalysis } from '@/lib/api-client';
import { UsageChart } from '@/components/charts/UsageChart';
import {
  ArrowLeft,
  User,
  Building2,
  MessageSquare,
  Brain,
  Zap,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  BarChart3,
  Layers,
  Mail,
} from 'lucide-react';

type TimeRange = 'today' | '7days';
type Metric = 'sessions' | 'tokens';
type ViewType = 'combined' | 'chat' | 'analysis';

function getChatTotalTokens(session: MaiaChatSession): number {
  return (
    session.totalInputTextTokens +
    session.totalInputImageTokens +
    session.totalInputAudioTokens +
    session.totalOutputTextTokens +
    session.totalOutputAudioTokens
  );
}

function getAnalysisTotalTokens(analysis: MaiaDeepAnalysis): number {
  return analysis.inputTokens + analysis.outputTokens;
}

interface UserDetailContentProps {
  userId: string;
}

export function UserDetailContent({ userId }: UserDetailContentProps) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [metric, setMetric] = useState<Metric>('tokens');
  const [viewType, setViewType] = useState<ViewType>('combined');

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

  // Filter deep analyses based on time range
  const filteredDeepAnalyses = useMemo(() => {
    if (!data?.deepAnalyses) return [];
    const cutoff = new Date();

    if (timeRange === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else {
      cutoff.setDate(cutoff.getDate() - 7);
      cutoff.setHours(0, 0, 0, 0);
    }

    return data.deepAnalyses.filter((a) => new Date(a.requestTime) >= cutoff);
  }, [data?.deepAnalyses, timeRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const chatCount = filteredChatSessions.length;
    const analysisCount = filteredDeepAnalyses.length;
    const activeSessions = filteredChatSessions.filter((s) => s.isActive).length;

    let inputTokens = 0;
    let outputTokens = 0;

    if (viewType === 'combined' || viewType === 'chat') {
      inputTokens += filteredChatSessions.reduce(
        (sum, s) =>
          sum +
          s.totalInputTextTokens +
          s.totalInputImageTokens +
          s.totalInputAudioTokens,
        0
      );
      outputTokens += filteredChatSessions.reduce(
        (sum, s) => sum + s.totalOutputTextTokens + s.totalOutputAudioTokens,
        0
      );
    }

    if (viewType === 'combined' || viewType === 'analysis') {
      inputTokens += filteredDeepAnalyses.reduce((sum, a) => sum + a.inputTokens, 0);
      outputTokens += filteredDeepAnalyses.reduce((sum, a) => sum + a.outputTokens, 0);
    }

    return {
      chatCount,
      analysisCount,
      activeSessions,
      totalTokens: inputTokens + outputTokens,
      inputTokens,
      outputTokens,
    };
  }, [filteredChatSessions, filteredDeepAnalyses, viewType]);

  // All-time stats
  const allTimeStats = useMemo(() => {
    if (!data) return { chatCount: 0, analysisCount: 0, totalTokens: 0 };

    const chatTokens = data.chatSessions.reduce((sum, s) => sum + getChatTotalTokens(s), 0);
    const analysisTokens = data.deepAnalyses.reduce((sum, a) => sum + getAnalysisTotalTokens(a), 0);

    return {
      chatCount: data.chatSessions.length,
      analysisCount: data.deepAnalyses.length,
      totalTokens: chatTokens + analysisTokens,
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Total Analyses</p>
              <p className="text-xl font-bold">{allTimeStats.analysisCount}</p>
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

      {/* View Type Selector */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setViewType('combined')}
          className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 text-left ${
            viewType === 'combined'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${viewType === 'combined' ? 'text-purple-400' : 'text-[var(--muted)]'}`} />
            <span className={`font-medium text-sm ${viewType === 'combined' ? 'text-white' : ''}`}>
              Combined View
            </span>
          </div>
        </button>

        <button
          onClick={() => setViewType('chat')}
          className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 text-left ${
            viewType === 'chat'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className={`w-4 h-4 ${viewType === 'chat' ? 'text-blue-400' : 'text-[var(--muted)]'}`} />
            <span className={`font-medium text-sm ${viewType === 'chat' ? 'text-white' : ''}`}>
              Chat Sessions
            </span>
          </div>
        </button>

        <button
          onClick={() => setViewType('analysis')}
          className={`px-4 py-3 rounded-xl border-2 transition-all duration-300 text-left ${
            viewType === 'analysis'
              ? 'border-pink-500 bg-pink-500/10'
              : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Brain className={`w-4 h-4 ${viewType === 'analysis' ? 'text-pink-400' : 'text-[var(--muted)]'}`} />
            <span className={`font-medium text-sm ${viewType === 'analysis' ? 'text-white' : ''}`}>
              Deep Analysis
            </span>
          </div>
        </button>
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
          deepAnalyses={filteredDeepAnalyses}
          timeRange={timeRange}
          metric={metric}
          viewType={viewType}
          height={320}
        />
      </Card>

      {/* Period Stats */}
      <Card className="p-4">
        <h3 className="font-medium mb-4">
          {timeRange === 'today' ? "Today's" : 'Last 7 Days'} Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[var(--card-hover)] rounded-lg">
            <p className="text-xs text-[var(--muted)] mb-1">Chat Sessions</p>
            <p className="text-lg font-bold">{stats.chatCount}</p>
          </div>
          <div className="p-3 bg-[var(--card-hover)] rounded-lg">
            <p className="text-xs text-[var(--muted)] mb-1">Analyses</p>
            <p className="text-lg font-bold">{stats.analysisCount}</p>
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
        {(() => {
          type RecentItem =
            | { type: 'chat'; data: MaiaChatSession; time: Date }
            | { type: 'analysis'; data: MaiaDeepAnalysis; time: Date };

          const recentItems: RecentItem[] = [];

          if (viewType === 'combined' || viewType === 'chat') {
            filteredChatSessions.forEach(session => {
              recentItems.push({ type: 'chat', data: session, time: new Date(session.startTime) });
            });
          }

          if (viewType === 'combined' || viewType === 'analysis') {
            filteredDeepAnalyses.forEach(analysis => {
              recentItems.push({ type: 'analysis', data: analysis, time: new Date(analysis.requestTime) });
            });
          }

          recentItems.sort((a, b) => b.time.getTime() - a.time.getTime());

          if (recentItems.length === 0) {
            return (
              <div className="text-center py-8 text-[var(--muted)]">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activity in this time period</p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {recentItems.slice(0, 10).map((item) => {
                if (item.type === 'chat') {
                  const session = item.data;
                  return (
                    <div
                      key={`chat-${session.id}`}
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
                            {item.time.toLocaleString()}
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
                  );
                } else {
                  const analysis = item.data;
                  return (
                    <div
                      key={`analysis-${analysis.id}`}
                      className="flex items-center justify-between p-3 bg-[var(--card-hover)] rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-pink-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {item.time.toLocaleString()}
                          </p>
                          <p className="text-xs text-[var(--muted)]">Deep Analysis</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">
                          {getAnalysisTotalTokens(analysis).toLocaleString()} tokens
                        </p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
