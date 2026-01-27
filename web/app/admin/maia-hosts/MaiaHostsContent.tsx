'use client';

import { Card, Button, Badge, Input } from '@/components/ui';
import { Server, Plus, Search, Settings, Trash2, Loader2, Globe, Activity } from 'lucide-react';
import { useState } from 'react';

interface MaiaHost {
  id: string;
  name: string;
  endpoint: string;
  region: string;
  isActive: boolean;
  status: 'online' | 'offline' | 'degraded';
  createdAt: string;
}

export function MaiaHostsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // TODO: Fetch hosts from API
  const hosts: MaiaHost[] = [];

  const filteredHosts = hosts.filter(host => 
    host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    host.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: MaiaHost['status']) => {
    switch (status) {
      case 'online':
        return <Badge variant="success">Online</Badge>;
      case 'offline':
        return <Badge variant="danger">Offline</Badge>;
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maia Hosts</h1>
          <p className="text-[var(--muted)]">Manage AI inference server endpoints.</p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4" />
          Add Host
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
        <Input
          placeholder="Search hosts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Hosts Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : filteredHosts.length === 0 ? (
        <Card className="p-8 text-center">
          <Server className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
          <h3 className="font-medium mb-2">No hosts configured</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Add your first Maia host to enable AI inference.
          </p>
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            Add Host
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHosts.map((host) => (
            <Card key={host.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">{host.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <Globe className="w-3 h-3" />
                      {host.region}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(host.status)}
                </div>
              </div>
              
              <div className="text-sm text-[var(--muted)] mb-4">
                <code className="bg-[var(--card-hover)] px-2 py-1 rounded text-xs break-all">
                  {host.endpoint}
                </code>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="flex-1">
                  <Activity className="w-4 h-4" />
                  Health Check
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-[var(--danger)]">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="p-5 bg-[var(--card-hover)]">
        <p className="text-sm text-[var(--muted)]">
          <strong className="text-white">Note:</strong> Host management is handled through the backend API. 
          The UI for adding and editing hosts will be added in a future update.
        </p>
      </Card>
    </div>
  );
}
