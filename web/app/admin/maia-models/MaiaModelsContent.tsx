'use client';

import { Card, Button, Badge, Input } from '@/components/ui';
import { Bot, Plus, Search, Settings, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, MaiaModel, ApiClientError } from '@/lib/api-client';

export function MaiaModelsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<MaiaModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getMaiaModels();
      setModels(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Failed to fetch models');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      await api.deleteMaiaModel(id);
      setModels(models.filter(m => m.id !== id));
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  const filteredModels = models.filter(model =>
    model.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.modelDisplayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      gcloud: 'Google Cloud',
      openai: 'OpenAI',
      self: 'Self-Hosted',
      invalid: 'Unknown',
    };
    return labels[provider] || provider;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      balanced: 'bg-blue-500/10 text-blue-400',
      thinking: 'bg-purple-500/10 text-purple-400',
      live: 'bg-green-500/10 text-green-400',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maia Models</h1>
          <p className="text-[var(--muted)]">Configure AI models available to Maia.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchModels} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary">
            <Plus className="w-4 h-4" />
            Add Model
          </Button>
        </div>
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

      {/* Error State */}
      {error && (
        <Card className="p-4 border-[var(--danger)] bg-[var(--danger)]/10">
          <p className="text-[var(--danger)]">{error}</p>
          <Button variant="ghost" size="sm" onClick={fetchModels} className="mt-2">
            Try Again
          </Button>
        </Card>
      )}

      {/* Models Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      ) : filteredModels.length === 0 ? (
        <Card className="p-8 text-center">
          <Bot className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
          <h3 className="font-medium mb-2">
            {models.length === 0 ? 'No models configured' : 'No models match your search'}
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            {models.length === 0
              ? 'Add your first AI model to get started.'
              : 'Try a different search term.'}
          </p>
          {models.length === 0 && (
            <Button variant="primary">
              <Plus className="w-4 h-4" />
              Add Model
            </Button>
          )}
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
                    <h3 className="font-medium">{model.modelDisplayName}</h3>
                    <p className="text-xs text-[var(--muted)]">{getProviderLabel(model.provider)}</p>
                  </div>
                </div>
                <Badge variant={model.isActive ? 'success' : 'default'}>
                  {model.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <code className="bg-[var(--card-hover)] px-2 py-1 rounded text-xs flex-1 truncate">
                  {model.modelName}
                </code>
                <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(model.modelCategory)}`}>
                  {model.modelCategory}
                </span>
              </div>

              {model.pricing > 0 && (
                <p className="text-xs text-[var(--muted)] mb-3">
                  Pricing: ${model.pricing.toFixed(4)}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="flex-1">
                  <Settings className="w-4 h-4" />
                  Configure
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--danger)]"
                  onClick={() => handleDelete(model.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {models.length > 0 && (
        <div className="flex gap-4 text-sm text-[var(--muted)]">
          <span>{models.length} total models</span>
          <span>{models.filter(m => m.isActive).length} active</span>
        </div>
      )}
    </div>
  );
}
