'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { api, useApi, MaiaChatSession, MaiaDeepAnalysis } from '@/lib/api-client';
import { UsageChart } from './UsageChart';
import { TrendingUp, Zap, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';

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

export function UsagePreview() {
  const { data: chatSessions, isLoading: isLoadingChat } = useApi(() => api.getChatSessions(), []);
  const { data: deepAnalyses, isLoading: isLoadingAnalyses } = useApi(() => api.getDeepAnalyses(), []);

  const isLoading = isLoadingChat || isLoadingAnalyses;

  // Filter to today's chat sessions
  const todayChatSessions = useMemo(() => {
    if (!chatSessions) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return chatSessions.filter((s) => new Date(s.startTime) >= startOfDay);
  }, [chatSessions]);

  // Filter to today's deep analyses
  const todayDeepAnalyses = useMemo(() => {
    if (!deepAnalyses) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return deepAnalyses.filter((a) => new Date(a.requestTime) >= startOfDay);
  }, [deepAnalyses]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSessions = todayChatSessions.length + todayDeepAnalyses.length;
    const chatTokens = todayChatSessions.reduce((sum, s) => sum + getChatTotalTokens(s), 0);
    const analysisTokens = todayDeepAnalyses.reduce((sum, a) => sum + getAnalysisTotalTokens(a), 0);
    const totalTokens = chatTokens + analysisTokens;
    return { totalSessions, totalTokens };
  }, [todayChatSessions, todayDeepAnalyses]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
          Today&apos;s Usage
        </h3>
        <Link
          href="/user/usage"
          className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
        >
          View Details
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[180px]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <>
          {/* Mini Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 p-3 bg-[var(--card-hover)] rounded-lg">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs text-[var(--muted)]">Sessions</p>
                <p className="font-bold">{stats.totalSessions}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-[var(--card-hover)] rounded-lg">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--muted)]">Tokens</p>
                <p className="font-bold">{stats.totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="h-[120px]">
            <UsageChart
              chatSessions={todayChatSessions}
              deepAnalyses={todayDeepAnalyses}
              timeRange="today"
              metric="tokens"
              viewType="combined"
              height={120}
            />
          </div>
        </>
      )}
    </Card>
  );
}
