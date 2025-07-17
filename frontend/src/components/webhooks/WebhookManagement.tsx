/**
 * Webhook Management Component
 * 
 * Comprehensive webhook management interface:
 * - Create, edit, and delete webhooks
 * - Event subscription configuration
 * - Filter and transformation setup
 * - Delivery monitoring and analytics
 * - Testing and validation tools
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  webhookService, 
  Webhook, 
  WebhookEvent, 
  WebhookFilter, 
  WebhookDelivery,
  WebhookStats,
  EventCategory
} from '@/services/webhookService';

interface WebhookManagementProps {
  className?: string;
}

export const WebhookManagement: React.FC<WebhookManagementProps> = ({
  className = ""
}) => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [availableEvents, setAvailableEvents] = useState<WebhookEvent[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [activeTab, setActiveTab] = useState<'webhooks' | 'deliveries' | 'analytics'>('webhooks');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [webhooksData, eventsData, categoriesData, statsData, deliveriesData] = await Promise.all([
        webhookService.getWebhooks(),
        webhookService.getAvailableEvents(),
        webhookService.getEventCategories(),
        webhookService.getStats(),
        webhookService.getDeliveries()
      ]);

      setWebhooks(webhooksData);
      setAvailableEvents(eventsData);
      setEventCategories(categoriesData);
      setStats(statsData);
      setDeliveries(deliveriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhook data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async (webhookData: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt' | 'secret'>) => {
    try {
      const newWebhook = await webhookService.createWebhook(webhookData);
      setWebhooks(prev => [...prev, newWebhook]);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webhook');
    }
  };

  const handleUpdateWebhook = async (id: string, updates: Partial<Webhook>) => {
    try {
      const updatedWebhook = await webhookService.updateWebhook(id, updates);
      setWebhooks(prev => prev.map(w => w.id === id ? updatedWebhook : w));
      setShowEditModal(false);
      setSelectedWebhook(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await webhookService.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete webhook');
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      await webhookService.testWebhook(id);
      // Refresh deliveries to show the test delivery
      const newDeliveries = await webhookService.getDeliveries();
      setDeliveries(newDeliveries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test webhook');
    }
  };

  const handleToggleWebhook = async (id: string, enabled: boolean) => {
    try {
      await webhookService.updateWebhook(id, { enabled });
      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, enabled } : w));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle webhook');
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading webhook data</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhook Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage webhooks, monitor deliveries, and track analytics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          >
            Create Webhook
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Total Webhooks</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalWebhooks}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Active</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.activeWebhooks}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Deliveries</h3>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalDeliveries}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Success Rate</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.deliveryRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Avg Response</h3>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.averageResponseTime.toFixed(0)}ms
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'webhooks', label: 'Webhooks', count: webhooks.length },
            { id: 'deliveries', label: 'Deliveries', count: deliveries.length },
            { id: 'analytics', label: 'Analytics' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          {webhooks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🪝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                No webhooks configured
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first webhook to start receiving event notifications
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                Create Webhook
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${webhook.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {webhook.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleWebhook(webhook.id, !webhook.enabled)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          webhook.enabled
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {webhook.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleTestWebhook(webhook.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWebhook(webhook);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">URL:</span>
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {webhook.url}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Description:</span>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {webhook.description || 'No description'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Events:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {webhook.events.filter(e => e.enabled).map((event) => (
                          <span
                            key={event.type}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {event.category.icon} {event.type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Created: {format(webhook.createdAt, 'MMM dd, yyyy')}
                      </span>
                      {webhook.lastTriggered && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Last triggered: {format(webhook.lastTriggered, 'MMM dd, HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Deliveries
            </h3>
            
            {deliveries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No deliveries yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Webhook
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Attempts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {deliveries.map((delivery) => {
                      const webhook = webhooks.find(w => w.id === delivery.webhookId);
                      return (
                        <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {webhook?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {delivery.eventType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              delivery.status === 'success' ? 'bg-green-100 text-green-800' :
                              delivery.status === 'failed' ? 'bg-red-100 text-red-800' :
                              delivery.status === 'retrying' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {delivery.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {delivery.attempts.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                            {format(delivery.createdAt, 'MMM dd, HH:mm')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && stats && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Events
            </h3>
            
            {stats.topEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No events tracked yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topEvents.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.event}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {event.count} deliveries
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <WebhookModal
          title="Create Webhook"
          webhook={null}
          availableEvents={availableEvents}
          onSave={handleCreateWebhook}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Webhook Modal */}
      {showEditModal && selectedWebhook && (
        <WebhookModal
          title="Edit Webhook"
          webhook={selectedWebhook}
          availableEvents={availableEvents}
          onSave={(data) => handleUpdateWebhook(selectedWebhook.id, data)}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedWebhook(null);
          }}
        />
      )}
    </div>
  );
};

// Webhook Modal Component
interface WebhookModalProps {
  title: string;
  webhook: Webhook | null;
  availableEvents: WebhookEvent[];
  onSave: (webhook: any) => void;
  onCancel: () => void;
}

const WebhookModal: React.FC<WebhookModalProps> = ({
  title,
  webhook,
  availableEvents,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: webhook?.name || '',
    url: webhook?.url || '',
    description: webhook?.description || '',
    events: webhook?.events || [],
    enabled: webhook?.enabled ?? true
  });

  const handleEventToggle = (eventType: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.map(event => 
        event.type === eventType ? { ...event, enabled: !event.enabled } : event
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Events
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableEvents.map((event) => (
                  <div key={event.type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={event.type}
                      checked={formData.events.some(e => e.type === event.type && e.enabled)}
                      onChange={() => handleEventToggle(event.type)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={event.type} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="mr-2">{event.category.icon}</span>
                      {event.type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">
                Enabled
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WebhookManagement;