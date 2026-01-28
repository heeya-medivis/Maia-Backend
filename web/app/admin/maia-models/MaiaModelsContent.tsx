'use client';

import { Card, Button, Badge, Input, Select, Toggle } from '@/components/ui';
import { Bot, Plus, Search, Settings, Trash2, Loader2, RefreshCw, X, Users, FileText, UserPlus, UserMinus } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { api, MaiaModel, MaiaOptions, ApiClientError, CreateMaiaModelInput, MaiaUserAccess, AvailableUser } from '@/lib/api-client';

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

type DetailTab = 'details' | 'access';

export function MaiaModelsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<MaiaModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Options from backend
  const [options, setOptions] = useState<MaiaOptions | null>(null);

  // Detail panel state
  const [selectedModel, setSelectedModel] = useState<MaiaModel | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateMaiaModelInput>(initialFormState);

  // User access state
  const [usersWithAccess, setUsersWithAccess] = useState<MaiaUserAccess[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');

  const isEditMode = selectedModel !== null;

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

  const fetchUserAccess = useCallback(async (modelId: string) => {
    setIsLoadingAccess(true);
    try {
      const [usersWithAccessData, availableUsersData] = await Promise.all([
        api.getUsersWithAccess(modelId),
        api.getAvailableUsers(modelId),
      ]);
      setUsersWithAccess(usersWithAccessData);
      setAvailableUsers(availableUsersData);
    } catch (err) {
      console.error('Failed to fetch user access:', err);
    } finally {
      setIsLoadingAccess(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    api.getMaiaOptions().then(setOptions).catch(console.error);
  }, []);

  // Fetch user access when switching to access tab or when model changes
  useEffect(() => {
    if (showDetailPanel && selectedModel && activeTab === 'access') {
      fetchUserAccess(selectedModel.id);
    }
  }, [showDetailPanel, selectedModel, activeTab, fetchUserAccess]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;

    try {
      await api.deleteMaiaModel(id);
      setModels(models.filter(m => m.id !== id));
      if (selectedModel?.id === id) {
        handleClosePanel();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to delete: ${err.message}`);
      }
    }
  };

  const handleClosePanel = useCallback(() => {
    setShowDetailPanel(false);
    setSelectedModel(null);
    setFormData(initialFormState);
    setActiveTab('details');
    setUsersWithAccess([]);
    setAvailableUsers([]);
    setSelectedUserToAdd('');
  }, []);

  const handleOpenCreate = useCallback(() => {
    setSelectedModel(null);
    setFormData(initialFormState);
    setActiveTab('details');
    setShowDetailPanel(true);
  }, []);

  const handleOpenEdit = useCallback((model: MaiaModel) => {
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
      hostProvider: undefined,
      serverIp: undefined,
    });
    setSelectedModel(model);
    setActiveTab('details');
    setShowDetailPanel(true);
  }, []);

  const handleCreate = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const newModel = await api.createMaiaModel(formData);
      setModels(prev => [...prev, newModel]);
      handleClosePanel();
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to create model: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, handleClosePanel]);

  const handleUpdate = useCallback(async () => {
    if (!selectedModel) return;

    setIsSubmitting(true);
    try {
      const updatedModel = await api.updateMaiaModel(selectedModel.id, formData);
      setModels(prev => prev.map(m => m.id === selectedModel.id ? updatedModel : m));
      setSelectedModel(updatedModel);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to update model: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedModel, formData]);

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

  const handleGrantAccess = useCallback(async () => {
    if (!selectedModel || !selectedUserToAdd) return;

    try {
      await api.manageUserAccess(selectedModel.id, selectedUserToAdd, true);
      setSelectedUserToAdd('');
      fetchUserAccess(selectedModel.id);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to grant access: ${err.message}`);
      }
    }
  }, [selectedModel, selectedUserToAdd, fetchUserAccess]);

  const handleRevokeAccess = useCallback(async (userId: string) => {
    if (!selectedModel) return;
    if (!confirm('Are you sure you want to revoke access for this user?')) return;

    try {
      await api.manageUserAccess(selectedModel.id, userId, false);
      fetchUserAccess(selectedModel.id);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(`Failed to revoke access: ${err.message}`);
      }
    }
  }, [selectedModel, fetchUserAccess]);

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
                <p className="text-xs text-[var(--muted)] mb-1">
                  Pricing: ${model.pricing.toFixed(4)}
                </p>
              )}

              {model.modifiedByName && (
                <p className="text-xs text-[var(--muted)] mb-3">
                  {model.modifiedDateTime ? 'Modified' : 'Created'} by {model.modifiedByName} on{' '}
                  {new Date(model.modifiedDateTime ?? model.createdDateTime).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleOpenEdit(model)}>
                  <Settings className="w-4 h-4" />
                  Manage
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

      {/* Detail Modal (Centered) */}
      {showDetailPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={handleClosePanel}
          />

          {/* Modal */}
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <Bot className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {isEditMode ? selectedModel?.modelDisplayName : 'Add New Model'}
                    </h2>
                    {isEditMode && selectedModel && (
                      <Badge variant={selectedModel.isActive ? 'success' : 'default'}>
                        {selectedModel.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {isEditMode ? (
                      <>
                        <code className="bg-[var(--card-hover)] px-2 py-0.5 rounded text-xs mr-2">
                          {selectedModel?.modelName}
                        </code>
                        {getProviderLabel(selectedModel?.provider || '')}
                      </>
                    ) : (
                      'Create a new AI model configuration'
                    )}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClosePanel}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs (only show in edit mode) */}
            {isEditMode && (
              <div className="border-b border-[var(--border)] px-6">
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'details'
                        ? 'border-[var(--accent)] text-white'
                        : 'border-transparent text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline-block mr-2" />
                    Model Details
                  </button>
                  <button
                    onClick={() => setActiveTab('access')}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'access'
                        ? 'border-[var(--accent)] text-white'
                        : 'border-transparent text-[var(--muted)] hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4 inline-block mr-2" />
                    User Access
                    {usersWithAccess.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-[var(--card-hover)] rounded text-xs">
                        {usersWithAccess.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'details' ? (
                /* Model Details Form */
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Model Name *</label>
                      <Input
                        placeholder="e.g., gpt-4o"
                        value={formData.modelName}
                        onChange={(e) => updateFormField('modelName', e.target.value)}
                      />
                      <p className="text-xs text-[var(--muted)] mt-1">Internal identifier used by the system</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Display Name *</label>
                      <Input
                        placeholder="e.g., GPT-4 Omni"
                        value={formData.modelDisplayName}
                        onChange={(e) => updateFormField('modelDisplayName', e.target.value)}
                      />
                      <p className="text-xs text-[var(--muted)] mt-1">User-friendly name shown in the app</p>
                    </div>

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

                  {/* Right Column */}
                  <div className="space-y-4">
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

                    {formData.provider === 3 && (
                      <div className="p-4 bg-[var(--card-hover)] rounded-lg space-y-4">
                        <p className="text-sm font-medium">Self-Hosted Configuration</p>
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

                    <div className="pt-2">
                      <Toggle
                        checked={formData.isActive ?? true}
                        onChange={(checked) => updateFormField('isActive', checked)}
                        label="Model is active"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* User Access Tab */
                <div className="grid grid-cols-2 gap-6">
                  {/* Add User Section */}
                  <div>
                    <div className="p-4 bg-[var(--card-hover)] rounded-lg">
                      <h3 className="text-sm font-medium mb-3">Add User Access</h3>
                      <div className="space-y-3">
                        <Select
                          options={availableUsers.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
                          value={selectedUserToAdd}
                          onChange={setSelectedUserToAdd}
                          placeholder="Select a user..."
                        />
                        <Button
                          variant="primary"
                          onClick={handleGrantAccess}
                          disabled={!selectedUserToAdd}
                          className="w-full"
                        >
                          <UserPlus className="w-4 h-4" />
                          Grant Access
                        </Button>
                      </div>
                      {availableUsers.length === 0 && !isLoadingAccess && (
                        <p className="text-xs text-[var(--muted)] mt-3">All users already have access to this model.</p>
                      )}
                    </div>
                  </div>

                  {/* Users with Access List */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Users with Access ({usersWithAccess.length})</h3>
                    {isLoadingAccess ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
                      </div>
                    ) : usersWithAccess.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-[var(--border)] rounded-lg">
                        <Users className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
                        <p className="text-sm text-[var(--muted)]">No users have access yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-auto">
                        {usersWithAccess.map((user) => (
                          <div
                            key={user.userId}
                            className="flex items-center justify-between p-3 bg-[var(--card-hover)] rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[var(--accent-muted)] rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-[var(--accent)]">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-[var(--muted)]">{user.email}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--danger)]"
                              onClick={() => handleRevokeAccess(user.userId)}
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--card-hover)]">
              <Button variant="ghost" onClick={handleClosePanel}>
                Cancel
              </Button>
              {activeTab === 'details' && (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isEditMode ? 'Saving...' : 'Creating...'}
                    </>
                  ) : (
                    isEditMode ? 'Save Changes' : 'Create Model'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
