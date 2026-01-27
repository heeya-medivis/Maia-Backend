'use client';

import { Card, Button, Badge, Input } from '@/components/ui';
import { 
  KeyRound, 
  Plus, 
  Search, 
  Globe, 
  Building2, 
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface AuthConnection {
  id: string;
  name: string;
  protocol: string;
  workosConnectionId: string | null;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface SsoDomain {
  id: string;
  domain: string;
  connectionId: string;
  organizationName: string | null;
  enabled: boolean;
  autoVerifyEmail: boolean;
  emailPattern: string | null;
  createdAt: string;
  connection?: AuthConnection;
}

// Protocol display names
const protocolLabels: Record<string, string> = {
  'workos_sso': 'Enterprise SSO (SAML/OIDC)',
  'workos_oidc_google': 'Google',
  'workos_oidc_microsoft': 'Microsoft',
  'workos_oidc_apple': 'Apple',
  'workos_magic_link': 'Magic Link',
};

export function SsoContent() {
  const [activeTab, setActiveTab] = useState<'domains' | 'connections'>('domains');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<AuthConnection[]>([]);
  const [domains, setDomains] = useState<SsoDomain[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);

  // Form state for adding domain
  const [newDomain, setNewDomain] = useState({
    domain: '',
    connectionId: '',
    organizationName: '',
  });

  // Form state for adding connection
  const [newConnection, setNewConnection] = useState({
    name: '',
    protocol: 'workos_sso',
    workosConnectionId: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [connectionsRes, domainsRes] = await Promise.all([
        fetch('/api/admin/sso/connections'),
        fetch('/api/admin/sso/domains'),
      ]);

      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        setConnections(data.connections || []);
      }
      if (domainsRes.ok) {
        const data = await domainsRes.json();
        setDomains(data.domains || []);
      }
    } catch (err) {
      setError('Failed to fetch SSO data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddDomain = async () => {
    if (!newDomain.domain || !newDomain.connectionId) return;
    
    try {
      const res = await fetch('/api/admin/sso/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDomain),
      });
      if (res.ok) {
        await fetchData();
        setShowAddDomain(false);
        setNewDomain({ domain: '', connectionId: '', organizationName: '' });
      }
    } catch (err) {
      console.error('Failed to add domain:', err);
    }
  };

  const handleAddConnection = async () => {
    if (!newConnection.name) return;
    
    try {
      const res = await fetch('/api/admin/sso/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConnection),
      });
      if (res.ok) {
        await fetchData();
        setShowAddConnection(false);
        setNewConnection({ name: '', protocol: 'workos_sso', workosConnectionId: '' });
      }
    } catch (err) {
      console.error('Failed to add connection:', err);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain mapping?')) return;
    
    try {
      const res = await fetch(`/api/admin/sso/domains/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete domain:', err);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection? All associated domains will also be deleted.')) return;
    
    try {
      const res = await fetch(`/api/admin/sso/connections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  };

  const handleToggleDomain = async (domain: SsoDomain) => {
    try {
      const res = await fetch(`/api/admin/sso/domains/${domain.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !domain.enabled }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle domain:', err);
    }
  };

  const handleToggleConnection = async (connection: AuthConnection) => {
    try {
      const res = await fetch(`/api/admin/sso/connections/${connection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !connection.enabled }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle connection:', err);
    }
  };

  const filteredDomains = domains.filter(d => 
    d.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.organizationName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConnections = connections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.workosConnectionId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SSO / Enterprise Authentication</h1>
          <p className="text-[var(--muted)]">
            Manage enterprise SSO connections and domain mappings for institutional login.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-[var(--accent-muted)] border-[var(--accent)]">
        <div className="flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-[var(--accent)] mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-[var(--accent)]">How Enterprise SSO Works</p>
            <p className="text-[var(--foreground)] mt-1">
              1. Create a <strong>Connection</strong> in WorkOS for the institution (SAML or OIDC).<br />
              2. Add the WorkOS connection ID here as a new connection.<br />
              3. Map the institution's email <strong>domain(s)</strong> to that connection.<br />
              4. When users enter their email (e.g., john@nyu.edu), they'll be redirected to their institution's login.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('domains')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'domains'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Globe className="w-4 h-4 inline mr-2" />
          Domains ({domains.length})
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'connections'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Connections ({connections.length})
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <Input
            placeholder={activeTab === 'domains' ? 'Search domains...' : 'Search connections...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => activeTab === 'domains' ? setShowAddDomain(true) : setShowAddConnection(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {activeTab === 'domains' ? 'Domain' : 'Connection'}
        </Button>
      </div>

      {/* Domains Tab */}
      {activeTab === 'domains' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--card-hover)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Domain</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Organization</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Connection</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Status</th>
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
                ) : filteredDomains.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                      {searchQuery ? 'No domains match your search.' : 'No SSO domains configured yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredDomains.map((domain) => (
                    <tr key={domain.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-[var(--accent)]" />
                          <span className="font-mono font-medium">@{domain.domain}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {domain.organizationName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--muted)]">
                        {domain.connection?.name || connections.find(c => c.id === domain.connectionId)?.name || domain.connectionId}
                      </td>
                      <td className="px-4 py-3">
                        {domain.enabled ? (
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default">
                            <XCircle className="w-3 h-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleDomain(domain)}
                          >
                            {domain.enabled ? (
                              <ToggleRight className="w-4 h-4 text-[var(--accent)]" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-[var(--muted)]" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDomain(domain.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--card-hover)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Protocol</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">WorkOS ID</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)]">Status</th>
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
                ) : filteredConnections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                      {searchQuery ? 'No connections match your search.' : 'No SSO connections configured yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredConnections.map((connection) => (
                    <tr key={connection.id} className="border-b border-[var(--border)] hover:bg-[var(--card-hover)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[var(--accent)]" />
                          <span className="font-medium">{connection.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="default">
                          {protocolLabels[connection.protocol] || connection.protocol}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[var(--muted)]">
                        {connection.workosConnectionId || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {connection.enabled ? (
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="default">
                            <XCircle className="w-3 h-3 mr-1" />
                            Disabled
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleConnection(connection)}
                          >
                            {connection.enabled ? (
                              <ToggleRight className="w-4 h-4 text-[var(--accent)]" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-[var(--muted)]" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteConnection(connection.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Domain Modal */}
      {showAddDomain && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add SSO Domain</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Domain</label>
                <Input
                  placeholder="nyu.edu"
                  value={newDomain.domain}
                  onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                />
                <p className="text-xs text-[var(--muted)] mt-1">Enter without the @ symbol</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Organization Name</label>
                <Input
                  placeholder="New York University"
                  value={newDomain.organizationName}
                  onChange={(e) => setNewDomain({ ...newDomain, organizationName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Connection</label>
                <select
                  className="w-full px-3 py-2 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg"
                  value={newDomain.connectionId}
                  onChange={(e) => setNewDomain({ ...newDomain, connectionId: e.target.value })}
                >
                  <option value="">Select a connection...</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowAddDomain(false)}>Cancel</Button>
                <Button onClick={handleAddDomain} disabled={!newDomain.domain || !newDomain.connectionId}>
                  Add Domain
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddConnection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add SSO Connection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  placeholder="NYU SAML"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Protocol</label>
                <select
                  className="w-full px-3 py-2 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg"
                  value={newConnection.protocol}
                  onChange={(e) => setNewConnection({ ...newConnection, protocol: e.target.value })}
                >
                  <option value="workos_sso">Enterprise SSO (SAML/OIDC)</option>
                  <option value="workos_oidc_google">Google</option>
                  <option value="workos_oidc_microsoft">Microsoft</option>
                  <option value="workos_oidc_apple">Apple</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WorkOS Connection ID</label>
                <Input
                  placeholder="conn_xxxxxxxxxxxxx"
                  value={newConnection.workosConnectionId}
                  onChange={(e) => setNewConnection({ ...newConnection, workosConnectionId: e.target.value })}
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  Get this from WorkOS Dashboard → Authentication → Connections
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setShowAddConnection(false)}>Cancel</Button>
                <Button onClick={handleAddConnection} disabled={!newConnection.name}>
                  Add Connection
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
