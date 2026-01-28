'use client';

import { Card, Button, Badge, Input } from '@/components/ui';
import { Users, Search, Shield, Mail, Calendar, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export function UsersContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // TODO: Fetch users from API
  const users: User[] = [];

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-[var(--muted)]">Manage platform users and permissions.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--card-hover)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Joined</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                    {searchQuery ? 'No users match your search.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-[var(--accent)]" />
                        </div>
                        <span className="font-medium">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email.split('@')[0]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.isAdmin ? (
                        <Badge variant="accent">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="default">User</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-5 bg-[var(--card-hover)]">
        <p className="text-sm text-[var(--muted)]">
          <strong className="text-white">Note:</strong> User management API endpoints will be added in a future update. 
          For now, use the database directly to manage users and admin permissions.
        </p>
      </Card>
    </div>
  );
}
