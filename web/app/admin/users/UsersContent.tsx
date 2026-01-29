'use client';

import { Card, Button, Badge, Input, Modal } from '@/components/ui';
import { Users, Search, Shield, Mail, Calendar, Loader2, RefreshCw, Building2, Briefcase, CheckCircle, XCircle, Clock, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, AdminUser, UpdateUserData, ApiClientError } from '@/lib/api-client';

export function UsersContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserData>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to fetch users');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      organization: user.organization,
      role: user.role,
      isAdmin: user.isAdmin,
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    setError(null);
    try {
      const updatedUser = await api.updateUser(editingUser.id, editForm);
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setEditingUser(null);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to update user');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.organization?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-[var(--muted)]">Manage platform users and permissions.</p>
        </div>
        <Button variant="ghost" onClick={fetchUsers} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-[var(--danger)] bg-[var(--danger)]/10">
          <p className="text-[var(--danger)]">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchUsers} className="mt-2">
            Try Again
          </Button>
        </Card>
      )}

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
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Email Confirmed</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Organization</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Last Login</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Joined</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)] mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)]">
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
                      {user.emailConfirmed ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[var(--muted)]" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.organization ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-[var(--muted)]" />
                          {user.organization}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.isAdmin && (
                          <Badge variant="accent">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.role ? (
                          <Badge variant="default">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {user.role}
                          </Badge>
                        ) : !user.isAdmin ? (
                          <span className="text-sm text-[var(--muted)]">—</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.lastLoginDateTime ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                          <Clock className="w-4 h-4" />
                          {new Date(user.lastLoginDateTime).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdDateTime).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats */}
      {users.length > 0 && (
        <div className="flex gap-4 text-sm text-[var(--muted)]">
          <span>{users.length} total users</span>
          <span>{users.filter(u => u.isAdmin).length} admins</span>
        </div>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User"
        size="md"
      >
        {editingUser && (
          <div className="space-y-4">
            <div className="text-sm text-[var(--muted)] mb-4">
              Editing: {editingUser.email}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <Input
                  value={editForm.firstName ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Input
                  value={editForm.lastName ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Organization</label>
              <Input
                value={editForm.organization ?? ''}
                onChange={(e) => setEditForm({ ...editForm, organization: e.target.value || null })}
                placeholder="Organization (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <Input
                value={editForm.role ?? ''}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value || null })}
                placeholder="Role (optional)"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={editForm.isAdmin ?? false}
                onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--input)] text-[var(--accent)]"
              />
              <label htmlFor="isAdmin" className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Access
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
