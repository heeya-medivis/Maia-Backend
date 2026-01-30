'use client';

import { Card, Input } from '@/components/ui';
import { User, Bell, ShieldCheck, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/api-client';

export default function UserSettingsPage() {
  const { data: currentUser, isLoading, error } = useCurrentUser();

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[var(--danger)] mb-2">Failed to load user data</p>
          <p className="text-sm text-[var(--muted)]">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-[var(--muted)]">Manage profile, security, and notifications.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="font-medium">Profile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[var(--muted)]">Name</label>
                <Input value={currentUser?.user.name ?? ''} disabled />
              </div>
              <div>
                <label className="text-sm text-[var(--muted)]">Email</label>
                <Input value={currentUser?.user.email ?? ''} disabled />
              </div>
              {currentUser?.tenant && (
                <div>
                  <label className="text-sm text-[var(--muted)]">Organization</label>
                  <Input value={currentUser.tenant.name} disabled />
                </div>
              )}
              {currentUser?.membership && (
                <div>
                  <label className="text-sm text-[var(--muted)]">Role</label>
                  <Input value={currentUser.membership.role} disabled />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="font-medium">Security</h3>
            </div>
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <label className="flex items-center justify-between gap-3">
                Require sign-in on startup
                <input type="checkbox" defaultChecked disabled />
              </label>
              <label className="flex items-center justify-between gap-3">
                Allow offline mode (7 days)
                <input type="checkbox" defaultChecked disabled />
              </label>
              <label className="flex items-center justify-between gap-3">
                Share anonymized usage data
                <input type="checkbox" disabled />
              </label>
            </div>
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-medium">Notifications</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[var(--muted)]">
            <label className="flex items-center justify-between gap-3">
              Credit balance alerts
              <input type="checkbox" defaultChecked disabled />
            </label>
            <label className="flex items-center justify-between gap-3">
              Device sign-in alerts
              <input type="checkbox" defaultChecked disabled />
            </label>
            <label className="flex items-center justify-between gap-3">
              Weekly summary
              <input type="checkbox" defaultChecked disabled />
            </label>
          </div>
      </Card>
    </div>
  );
}
