/**
 * Integration Management Component
 *
 * Comprehensive interface for managing third-party integrations:
 * - Browse and configure integrations
 * - OAuth flow handling
 * - Integration status monitoring
 * - Settings and permissions management
 * - Integration analytics and usage tracking
 */

import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle,
  Edit,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  Integration,
  IntegrationCategory,
  IntegrationStatus,
  IntegrationType,
  integrationService,
} from '../../services/integrationService';

interface IntegrationManagementProps {
  className?: string;
}

export const IntegrationManagement: React.FC<IntegrationManagementProps> = ({ className = '' }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [availableTypes, setAvailableTypes] = useState<IntegrationType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [integrationsData, typesData] = await Promise.all([
        integrationService.getIntegrations(),
        integrationService.getAvailableTypes(),
      ]);
      setIntegrations(integrationsData);
      setAvailableTypes(typesData);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = async (typeId: string, config: any) => {
    try {
      const newIntegration = await integrationService.createIntegration({
        typeId,
        config,
        enabled: true,
      });
      setIntegrations([...integrations, newIntegration]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to create integration:', error);
    }
  };

  const handleToggleIntegration = async (id: string, enabled: boolean) => {
    try {
      await integrationService.updateIntegration(id, { enabled });
      setIntegrations(
        integrations.map((integration) =>
          integration.id === id ? { ...integration, enabled } : integration
        )
      );
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      await integrationService.deleteIntegration(id);
      setIntegrations(integrations.filter((integration) => integration.id !== id));
    } catch (error) {
      console.error('Failed to delete integration:', error);
    }
  };

  const getStatusIcon = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Activity className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: IntegrationCategory) => {
    switch (category) {
      case 'communication':
        return <MessageSquare className="w-5 h-5" />;
      case 'monitoring':
        return <BarChart3 className="w-5 h-5" />;
      case 'cicd':
        return <GitBranch className="w-5 h-5" />;
      case 'cloud':
        return <Globe className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'alerting':
        return <Bell className="w-5 h-5" />;
      default:
        return <Zap className="w-5 h-5" />;
    }
  };

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      availableTypes.find((type) => type.id === integration.type.id)?.category === selectedCategory;
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.type.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: { value: IntegrationCategory | 'all'; label: string; count: number }[] = [
    {
      value: 'all',
      label: 'All Integrations',
      count: integrations.length,
    },
    {
      value: 'communication',
      label: 'Communication',
      count: integrations.filter(
        (i) => availableTypes.find((t) => t.id === i.type.id)?.category === 'communication'
      ).length,
    },
    {
      value: 'monitoring',
      label: 'Monitoring',
      count: integrations.filter(
        (i) => availableTypes.find((t) => t.id === i.type.id)?.category === 'monitoring'
      ).length,
    },
    {
      value: 'cicd',
      label: 'CI/CD',
      count: integrations.filter(
        (i) => availableTypes.find((t) => t.id === i.type.id)?.category === 'cicd'
      ).length,
    },
    {
      value: 'cloud',
      label: 'Cloud',
      count: integrations.filter(
        (i) => availableTypes.find((t) => t.id === i.type.id)?.category === 'cloud'
      ).length,
    },
  ];

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
          <p className="text-gray-600 mt-1">
            Connect OpsSight with your favorite tools and services
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => {
                setSelectedCategory(category.value);
              }}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => {
          const type = availableTypes.find((t) => t.id === integration.type.id);
          return (
            <div
              key={integration.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Integration Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getCategoryIcon(type?.category || 'communication')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                    <p className="text-sm text-gray-600">{type?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(integration.status)}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setSelectedIntegration(integration);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status and Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      integration.status === 'connected'
                        ? 'text-green-600'
                        : integration.status === 'error'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                    }`}
                  >
                    {integration.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Used:</span>
                  <span className="text-gray-900">
                    {integration.lastUsed
                      ? format(new Date(integration.lastUsed), 'MMM d, yyyy')
                      : 'Never'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={integration.enabled}
                      onChange={(e) => handleToggleIntegration(integration.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Enabled
                  </label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedIntegration(integration);
                        setShowConfigModal(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Configure"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteIntegration(integration.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Zap className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No integrations found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first integration'}
          </p>
          <button
            onClick={() => {
              setShowAddModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Add Integration
          </button>
        </div>
      )}

      {/* Add Integration Modal */}
      {showAddModal && (
        <AddIntegrationModal
          availableTypes={availableTypes}
          onClose={() => {
            setShowAddModal(false);
          }}
          onCreate={handleCreateIntegration}
        />
      )}

      {/* Configuration Modal */}
      {showConfigModal && selectedIntegration && (
        <IntegrationConfigModal
          integration={selectedIntegration}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedIntegration(null);
          }}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};

// Add Integration Modal Component
interface AddIntegrationModalProps {
  availableTypes: IntegrationType[];
  onClose: () => void;
  onCreate: (typeId: string, config: any) => void;
}

const AddIntegrationModal: React.FC<AddIntegrationModalProps> = ({
  availableTypes,
  onClose,
  onCreate,
}) => {
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [config, setConfig] = useState<any>({});
  const [step, setStep] = useState<'select' | 'configure'>('select');

  const handleTypeSelect = (type: IntegrationType) => {
    setSelectedType(type);
    setStep('configure');
  };

  const handleCreate = () => {
    if (selectedType) {
      onCreate(selectedType.id, config);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Add Integration</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {step === 'select' ? (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Choose the type of integration you want to add:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    handleTypeSelect(type);
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-100 rounded">{getCategoryIcon(type.category)}</div>
                    <h4 className="font-medium">{type.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => {
                setStep('select');
              }}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to selection
            </button>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Configure {selectedType?.name}</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Integration Name
                  </label>
                  <input
                    type="text"
                    value={config.name || ''}
                    onChange={(e) => {
                      setConfig({ ...config, name: e.target.value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`My ${selectedType?.name} Integration`}
                  />
                </div>

                {selectedType?.category === 'communication' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={config.webhookUrl || ''}
                        onChange={(e) => {
                          setConfig({ ...config, webhookUrl: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://hooks.slack.com/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Channel
                      </label>
                      <input
                        type="text"
                        value={config.defaultChannel || ''}
                        onChange={(e) => {
                          setConfig({ ...config, defaultChannel: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="#general"
                      />
                    </div>
                  </>
                )}

                {selectedType?.category === 'monitoring' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={config.apiKey || ''}
                        onChange={(e) => {
                          setConfig({ ...config, apiKey: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your API key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base URL
                      </label>
                      <input
                        type="url"
                        value={config.baseUrl || ''}
                        onChange={(e) => {
                          setConfig({ ...config, baseUrl: e.target.value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://api.example.com"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!config.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Integration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Integration Configuration Modal Component
interface IntegrationConfigModalProps {
  integration: Integration;
  onClose: () => void;
  onUpdate: () => void;
}

const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  integration,
  onClose,
  onUpdate,
}) => {
  const [config, setConfig] = useState(integration.config);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await integrationService.updateIntegration(integration.id, { config });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update integration:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Configure {integration.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Integration Name</label>
            <input
              type="text"
              value={config.name || ''}
              onChange={(e) => {
                setConfig({ ...config, name: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={config.description || ''}
              onChange={(e) => {
                setConfig({ ...config, description: e.target.value });
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getCategoryIcon(category: IntegrationCategory) {
  switch (category) {
    case 'communication':
      return <MessageSquare className="w-5 h-5" />;
    case 'monitoring':
      return <BarChart3 className="w-5 h-5" />;
    case 'cicd':
      return <GitBranch className="w-5 h-5" />;
    case 'cloud':
      return <Globe className="w-5 h-5" />;
    case 'email':
      return <Mail className="w-5 h-5" />;
    case 'alerting':
      return <Bell className="w-5 h-5" />;
    default:
      return <Zap className="w-5 h-5" />;
  }
}
