'use client';

import { Card, Button, Badge, Input } from '@/components/ui';
import { Bot, Plus, Search, Settings, Trash2, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface MaiaModel {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
}

export function MaiaModelsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // TODO: Fetch models from API
  const models: MaiaModel[] = [];

  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.modelId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maia Models</h1>
          <p className="text-[var(--muted)]">Configure AI models available to Maia.</p>
        </div>
        <Button variant="primary">
          <Plus className="w-4 h-4" />
          Add Model
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
        <Input
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Models Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : filteredModels.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
          <h3 className="font-medium mb-2">No models configured</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            Add your first AI model to get started.
          </p>
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            Add Model
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => (
            <Card key={model.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">{model.name}</h3>
                    <p className="text-xs text-[var(--muted)]">{model.provider}</p>
                  </div>
                </div>
                <Badge variant={model.isActive ? 'success' : 'default'}>
                  {model.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="text-sm text-[var(--muted)] mb-4">
                <code className="bg-[var(--card-hover)] px-2 py-1 rounded text-xs">
                  {model.modelId}
                </code>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="flex-1">
                  <Settings className="w-4 h-4" />
                  Configure
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
          <strong className="text-white">Note:</strong> Model management is handled through the backend API. 
          The UI for adding and editing models will be added in a future update.
        </p>
      </Card>
    </div>
  );
}
