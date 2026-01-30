'use client';

import { Card, Badge } from '@/components/ui';
import { Users, Bot, Shield, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api, useApi } from '@/lib/api-client';

export function AdminDashboardContent() {
  const { data: users, isLoading: usersLoading } = useApi(() => api.getUsers(), []);
  const { data: models, isLoading: modelsLoading } = useApi(() => api.getMaiaModels(), []);

  const totalUsers = users?.length ?? 0;
  const activeModels = models?.filter(m => m.isActive).length ?? 0;
  const isLoading = usersLoading || modelsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-[var(--muted)]">Manage Maia platform settings and monitor system health.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Total Users</p>
              <p className="text-2xl font-bold mt-1">
                {usersLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)]">Active Models</p>
              <p className="text-2xl font-bold mt-1">
                {modelsLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : activeModels}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/users">
          <Card className="p-5 hover:border-[var(--accent)] transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium">Manage Users</h3>
                <p className="text-sm text-[var(--muted)]">View and manage all users</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/maia-models">
          <Card className="p-5 hover:border-[var(--accent)] transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium">Maia Management</h3>
                <p className="text-sm text-[var(--muted)]">Configure AI models</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/sessions">
          <Card className="p-5 hover:border-[var(--accent)] transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="font-medium">Maia Usage</h3>
                <p className="text-sm text-[var(--muted)]">Monitor token usage</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* System Status */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[var(--accent)]" />
          <h3 className="font-medium">System Status</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-[var(--card-hover)] rounded-lg">
            <span className="text-sm">API Server</span>
            <Badge variant="success">Operational</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--card-hover)] rounded-lg">
            <span className="text-sm">Database</span>
            <Badge variant="success">Operational</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--card-hover)] rounded-lg">
            <span className="text-sm">AI Services</span>
            <Badge variant="success">Operational</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
