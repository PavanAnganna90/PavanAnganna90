/**
 * Notification Settings Component
 * 
 * Settings interface for push notifications:
 * - Enable/disable notifications
 * - Category preferences
 * - Quiet hours configuration
 * - Sound and vibration settings
 * - Notification history
 * - Analytics dashboard
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  pushNotificationService, 
  NotificationSettings, 
  NotificationCategory,
  NotificationPayload,
  NotificationAnalytics
} from '@/services/pushNotificationService';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className = ""
}) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [history, setHistory] = useState<NotificationPayload[]>([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'history' | 'analytics'>('general');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      await pushNotificationService.initialize();
      
      const [currentSettings, availableCategories, notificationHistory, analyticsData] = await Promise.all([
        pushNotificationService.getSettings(),
        pushNotificationService.getCategories(),
        pushNotificationService.getNotificationHistory(),
        pushNotificationService.getAnalytics()
      ]);

      setSettings(currentSettings);
      setCategories(availableCategories);
      setHistory(notificationHistory);
      setAnalytics(analyticsData);
      setIsSubscribed(Notification.permission === 'granted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      await pushNotificationService.subscribe();
      setIsSubscribed(true);
      
      await pushNotificationService.updateSettings({ enabled: true });
      setSettings(prev => prev ? { ...prev, enabled: true } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await pushNotificationService.unsubscribe();
      setIsSubscribed(false);
      
      await pushNotificationService.updateSettings({ enabled: false });
      setSettings(prev => prev ? { ...prev, enabled: false } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable notifications');
    }
  };

  const handleSettingsChange = async (newSettings: Partial<NotificationSettings>) => {
    try {
      await pushNotificationService.updateSettings(newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const handleCategoryToggle = async (categoryId: string, enabled: boolean) => {
    if (!settings) return;

    const newCategories = {
      ...settings.categories,
      [categoryId]: enabled
    };

    await handleSettingsChange({ categories: newCategories });
  };

  const handleTestNotification = async () => {
    try {
      await pushNotificationService.sendNotification({
        title: 'Test Notification',
        body: 'This is a test notification from OpsSight',
        category: categories.find(c => c.id === 'system')!,
        priority: 'normal',
        icon: '/icon-192x192.png'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification');
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
          <h3 className="text-red-800 font-medium">Error loading notification settings</h3>
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

  if (!settings) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notification Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your push notification preferences
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTestNotification}
            disabled={!isSubscribed}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium transition-colors"
          >
            Test Notification
          </button>
        </div>
      </div>

      {/* Master Enable/Disable */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Push Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {isSubscribed ? 'Notifications are enabled' : 'Enable notifications to receive alerts'}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <button
              onClick={isSubscribed ? handleDisableNotifications : handleEnableNotifications}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                isSubscribed 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isSubscribed ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: 'General' },
            { id: 'categories', label: 'Categories' },
            { id: 'history', label: 'History' },
            { id: 'analytics', label: 'Analytics' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                General Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sound
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Play sound for notifications
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingsChange({ soundEnabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Vibration
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Vibrate device for notifications
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.vibrationEnabled}
                    onChange={(e) => handleSettingsChange({ vibrationEnabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Show on Lock Screen
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Display notifications on lock screen
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showOnLockScreen}
                    onChange={(e) => handleSettingsChange({ showOnLockScreen: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Batch Notifications
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Group similar notifications together
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.batchingEnabled}
                    onChange={(e) => handleSettingsChange({ batchingEnabled: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quiet Hours
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Quiet Hours
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Disable notifications during specific hours
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.quietHours.enabled}
                    onChange={(e) => handleSettingsChange({ 
                      quietHours: { ...settings.quietHours, enabled: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>

                {settings.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.start}
                        onChange={(e) => handleSettingsChange({
                          quietHours: { ...settings.quietHours, start: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={settings.quietHours.end}
                        onChange={(e) => handleSettingsChange({
                          quietHours: { ...settings.quietHours, end: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Categories */}
        {activeTab === 'categories' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Notification Categories
            </h3>
            
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{category.icon}</div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {category.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          category.priority === 'high' ? 'bg-red-100 text-red-800' :
                          category.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {category.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <input
                    type="checkbox"
                    checked={settings.categories[category.id] || false}
                    onChange={(e) => handleCategoryToggle(category.id, e.target.checked)}
                    disabled={!category.canDisable}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Notification History
            </h3>
            
            {history.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg">{notification.category.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.body}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(notification.timestamp, 'MMM dd, HH:mm')}
                        </span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Total Sent</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics.totalSent}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Delivered</h3>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {analytics.totalDelivered}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Failed</h3>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {analytics.totalFailed}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Delivery Rate</h3>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {analytics.deliveryRate.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Categories
              </h3>
              <div className="space-y-2">
                {analytics.topCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {category.category}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {category.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettings;