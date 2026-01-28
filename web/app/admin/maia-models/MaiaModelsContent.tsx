'use client';

import { Card, Button, Badge, Input, FormDialog, Select, Toggle } from '@/components/ui';
import { Bot, Plus, Search, Settings, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { api, MaiaModel, MaiaOptions, ApiClientError, CreateMaiaModelInput } from '@/lib/api-client';

const initialFormState: CreateMaiaModelInput = {
  modelName: '',
  modelDisplayName: '',
  modelCategory: 0,
  provider: 2, // OpenAI default
  modelPriority: undefined,
  pricing: undefined,
  isActive: true,
  hostProvider: undefined,
  serverIp: undefined,
};

export function MaiaModelsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<MaiaModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Options from backend
  const [options, setOptions] = useState<MaiaOptions | null>(null);

  // Modal state (used for both create and edit)
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateMaiaModelInput>(initialFormState);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);

  const isEditMode = editingModelId !== null;

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
    // Fetch options once on mount
    api.getMaiaOptions().then(setOptions).catch(console.error);
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

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setFormData(initialFormState);
    setEditingModelId(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setFormData(initialFormState);
    setEditingModelId(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((model: MaiaModel) => {
    // Map model data to form data
    // Need to convert db values back to numeric enum values
    const categoryMap: Record<string, number> = { balanced: 0, thinking: 1, live: 2 };
    const providerMap: Record<string, number> = { invalid: 0, gcloud: 1, openai: 2, self: 3 };

    setFormData({
      modelName: model.modelName,
      modelDisplayName: model.modelDisplayName,
      modelCategory: categoryMap[model.modelCategory] ?? 0,
      provider: providerMap[model.provider] ?? 2,
      modelPriority: model.modelPriority ?? undefined,
      pricing: model.pricing != null ? String(model.pricing) : undefined,
      isActive: model.isActive,
      hostProvider: undefined, // Will be loaded if needed
      serverIp: undefined, // Will be loaded if needed
    });
    setEditingModelId(model.id);
    setShowModal(true);
  }, []);

  const handleCreate = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const newModel = await api.createMaiaModel(formData);
      setModels(prev => [...prev, newModel]);
      setShowModal(false);
      setFormData(initialFormState);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to create model: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

  const handleUpdate = useCallback(async () => {
    if (!editingModelId) return;

    setIsSubmitting(true);
    try {
      const updatedModel = await api.updateMaiaModel(editingModelId, formData);
      setModels(prev => prev.map(m => m.id === editingModelId ? updatedModel : m));
      setShowModal(false);
      setFormData(initialFormState);
      setEditingModelId(null);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to update model: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [editingModelId, formData]);

  const handleSubmit = useCallback(() => {
    if (isEditMode) {
      handleUpdate();
    } else {
      handleCreate();
    }
  }, [isEditMode, handleUpdate, handleCreate]);

  const updateFormField = useCallback(<K extends keyof CreateMaiaModelInput>(
    field: K,
    value: CreateMaiaModelInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

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
          <Button variant="primary" onClick={handleOpenCreate}>
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
            <Button variant="primary" onClick={handleOpenCreate}>
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
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleOpenEdit(model)}>
                  <Settings className="w-4 h-4" />
                  Edit
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

      {/* Create/Edit Model Modal */}
      <FormDialog
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={isEditMode ? 'Edit Model Details' : 'Add New Model'}
        submitLabel={isEditMode ? 'Save Changes' : 'Create Model'}
        isLoading={isSubmitting}
        size="lg"
      >
        <div className="space-y-4">
          {/* Model Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Model Name *</label>
            <Input
              placeholder="e.g., gpt-4o"
              value={formData.modelName}
              onChange={(e) => updateFormField('modelName', e.target.value)}
            />
            <p className="text-xs text-[var(--muted)] mt-1">Internal identifier used by the system</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Display Name *</label>
            <Input
              placeholder="e.g., GPT-4 Omni"
              value={formData.modelDisplayName}
              onChange={(e) => updateFormField('modelDisplayName', e.target.value)}
            />
            <p className="text-xs text-[var(--muted)] mt-1">User-friendly name shown in the app</p>
          </div>

          {/* Category & Provider Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <Select
                options={options?.categories.map(c => ({ value: String(c.value), label: c.label })) ?? []}
                value={String(formData.modelCategory)}
                onChange={(val) => updateFormField('modelCategory', parseInt(val))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provider *</label>
              <Select
                options={options?.providers.map(p => ({ value: String(p.value), label: p.label })) ?? []}
                value={String(formData.provider)}
                onChange={(val) => updateFormField('provider', parseInt(val))}
              />
            </div>
          </div>

          {/* Priority & Pricing Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <Input
                type="number"
                placeholder="e.g., 1"
                value={formData.modelPriority?.toString() ?? ''}
                onChange={(e) => updateFormField('modelPriority', e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <p className="text-xs text-[var(--muted)] mt-1">Lower = higher priority</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pricing</label>
              <Input
                type="text"
                placeholder="e.g., 0.01"
                value={formData.pricing ?? ''}
                onChange={(e) => updateFormField('pricing', e.target.value || undefined)}
              />
              <p className="text-xs text-[var(--muted)] mt-1">Cost per request/token</p>
            </div>
          </div>

          {/* Self-hosted fields (only show when provider is self-hosted) */}
          {formData.provider === 3 && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--card-hover)] rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Host Provider</label>
                <Select
                  options={options?.hostProviders.map(h => ({ value: String(h.value), label: h.label })) ?? []}
                  value={formData.hostProvider?.toString() ?? ''}
                  onChange={(val) => updateFormField('hostProvider', parseInt(val))}
                  placeholder="Select provider"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Server IP</label>
                <Input
                  placeholder="e.g., 192.168.1.100"
                  value={formData.serverIp ?? ''}
                  onChange={(e) => updateFormField('serverIp', e.target.value || undefined)}
                />
              </div>
            </div>
          )}

          {/* Active Toggle */}
          <div className="pt-2">
            <Toggle
              checked={formData.isActive ?? true}
              onChange={(checked) => updateFormField('isActive', checked)}
              label="Model is active"
            />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
