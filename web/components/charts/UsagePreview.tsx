'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { api, useApi, MaiaSession } from '@/lib/api-client';
import { UsageChart } from './UsageChart';
import { TrendingUp, Zap, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';

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

export function UsagePreview() {
  const { data: chatSessions, isLoading } = useApi(() => api.getSessions(), []);

  // Filter to today's chat sessions
  const todayChatSessions = useMemo(() => {
    if (!chatSessions) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return chatSessions.filter((s) => new Date(s.startTime) >= startOfDay);
  }, [chatSessions]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSessions = todayChatSessions.length;
    const totalTokens = todayChatSessions.reduce((sum, s) => sum + getChatTotalTokens(s), 0);
    return { totalSessions, totalTokens };
  }, [todayChatSessions]);

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
        <div className="flex items-center justify-center h-[260px]">
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
          <div className="h-[200px]">
            <UsageChart
              chatSessions={todayChatSessions}
              timeRange="today"
              metric="tokens"
              height={200}
            />
          </div>
        </>
      )}
    </Card>
  );
}
