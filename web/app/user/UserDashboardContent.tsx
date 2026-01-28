'use client';

import { Card, Button, Badge, ToastContainer, useToast } from '@/components/ui';
import { Loader2, User, Settings } from 'lucide-react';
import { useCurrentUser } from '@/lib/api-client';
import Link from 'next/link';

interface UserDashboardContentProps {
  firstName: string;
}

export function UserDashboardContent({ firstName }: UserDashboardContentProps) {
  const toast = useToast();
  const { data: currentUser, isLoading } = useCurrentUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
          <p className="text-[var(--muted)]">Your Maia dashboard</p>
        </div>
        <Button variant="primary" onClick={() => toast.info('Open the Maia desktop app to start a new session.')}>
          New Maia session
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[var(--accent)] rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-black" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{currentUser?.user?.name || firstName}</h2>
                <p className="text-[var(--muted)]">{currentUser?.user?.email}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted)]">Role</span>
                <Badge variant="accent">{currentUser?.membership?.role || 'user'}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted)]">Organization</span>
                <span className="font-medium">{currentUser?.tenant?.name || 'Personal'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[var(--muted)]">User ID</span>
                <span className="font-mono text-xs text-[var(--muted)]">{currentUser?.user?.id?.slice(0, 8)}...</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-medium mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/user/settings" className="block">
                <Button variant="secondary" className="w-full justify-start gap-3">
                  <Settings className="w-5 h-5" />
                  Account Settings
                </Button>
              </Link>
              <Button 
                variant="secondary" 
                className="w-full justify-start gap-3"
                onClick={() => toast.info('Download the Maia desktop app to get started.')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Desktop App
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-[var(--card-hover)] rounded-lg">
              <p className="text-sm text-[var(--muted)]">
                <strong className="text-white">Getting Started:</strong> Download the Maia desktop application to start using AI-powered assistance in your workflow.
              </p>
            </div>
          </Card>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}
