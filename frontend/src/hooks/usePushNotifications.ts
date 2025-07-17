/**
 * Push Notifications Hook
 * 
 * React hook for managing push notifications:
 * - Subscription management
 * - Settings synchronization
 * - Notification history
 * - Real-time status updates
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  pushNotificationService, 
  NotificationSettings, 
  NotificationCategory,
  NotificationPayload,
  NotificationAnalytics,
  PushSubscription
} from '@/services/pushNotificationService';

export interface UsePushNotificationsResult {
  // Status
  isSupported: boolean;
  isSubscribed: boolean;
  isInitialized: boolean;
  permission: NotificationPermission;
  error: string | null;
  loading: boolean;
  
  // Data
  settings: NotificationSettings | null;
  categories: NotificationCategory[];
  history: NotificationPayload[];
  analytics: NotificationAnalytics | null;
  subscription: PushSubscription | null;
  
  // Actions
  initialize: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  sendNotification: (payload: Omit<NotificationPayload, 'id' | 'timestamp'>) => Promise<string>;
  refreshHistory: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  testNotification: () => Promise<void>;
}

export const usePushNotifications = (): UsePushNotificationsResult => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [categories, setCategories] = useState<NotificationCategory[]>([]);
  const [history, setHistory] = useState<NotificationPayload[]>([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = (
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window
    );
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Initialize the service
  const initialize = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await pushNotificationService.initialize();
      
      // Load initial data
      const [
        currentSettings,
        availableCategories,
        notificationHistory,
        analyticsData
      ] = await Promise.all([
        pushNotificationService.getSettings(),
        pushNotificationService.getCategories(),
        pushNotificationService.getNotificationHistory(),
        pushNotificationService.getAnalytics()
      ]);

      setSettings(currentSettings);
      setCategories(availableCategories);
      setHistory(notificationHistory);
      setAnalytics(analyticsData);
      setIsInitialized(true);
      setIsSubscribed(Notification.permission === 'granted' && currentSettings.enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize push notifications');
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isInitialized) {
      await initialize();
    }

    setLoading(true);
    setError(null);

    try {
      const newSubscription = await pushNotificationService.subscribe();
      setSubscription(newSubscription);
      setIsSubscribed(true);
      setPermission(Notification.permission);
      
      // Update settings to enable notifications
      await pushNotificationService.updateSettings({ enabled: true });
      const updatedSettings = pushNotificationService.getSettings();
      setSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to push notifications');
    } finally {
      setLoading(false);
    }
  }, [isInitialized, initialize]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await pushNotificationService.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      setPermission(Notification.permission);
      
      // Update settings to disable notifications
      await pushNotificationService.updateSettings({ enabled: false });
      const updatedSettings = pushNotificationService.getSettings();
      setSettings(updatedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe from push notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update notification settings
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!settings) return;

    setError(null);

    try {
      await pushNotificationService.updateSettings(newSettings);
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification settings');
    }
  }, [settings]);

  // Send notification
  const sendNotification = useCallback(async (payload: Omit<NotificationPayload, 'id' | 'timestamp'>) => {
    setError(null);

    try {
      const notificationId = await pushNotificationService.sendNotification(payload);
      
      // Refresh history to include the new notification
      await refreshHistory();
      
      return notificationId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
      throw err;
    }
  }, []);

  // Refresh notification history
  const refreshHistory = useCallback(async () => {
    try {
      const newHistory = await pushNotificationService.getNotificationHistory();
      setHistory(newHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh notification history');
    }
  }, []);

  // Refresh analytics
  const refreshAnalytics = useCallback(async () => {
    try {
      const newAnalytics = await pushNotificationService.getAnalytics();
      setAnalytics(newAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh analytics');
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    try {
      const granted = await pushNotificationService.requestPermission();
      setPermission(Notification.permission);
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      return false;
    }
  }, []);

  // Send test notification
  const testNotification = useCallback(async () => {
    if (!isSubscribed) {
      throw new Error('Not subscribed to push notifications');
    }

    const testCategory = categories.find(c => c.id === 'system');
    if (!testCategory) {
      throw new Error('Test category not found');
    }

    await sendNotification({
      title: 'Test Notification',
      body: 'This is a test notification from OpsSight DevOps Platform',
      category: testCategory,
      priority: 'normal',
      icon: '/icon-192x192.png',
      data: { test: true }
    });
  }, [isSubscribed, categories, sendNotification]);

  // Monitor permission changes
  useEffect(() => {
    const handlePermissionChange = () => {
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted' && settings?.enabled === true);
    };

    // Listen for permission changes (some browsers support this)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.onchange = handlePermissionChange;
      });
    }

    return () => {
      // Cleanup if needed
    };
  }, [settings?.enabled]);

  // Auto-initialize on mount
  useEffect(() => {
    if (isSupported && !isInitialized) {
      initialize();
    }
  }, [isSupported, isInitialized, initialize]);

  return {
    // Status
    isSupported,
    isSubscribed,
    isInitialized,
    permission,
    error,
    loading,
    
    // Data
    settings,
    categories,
    history,
    analytics,
    subscription,
    
    // Actions
    initialize,
    subscribe,
    unsubscribe,
    updateSettings,
    sendNotification,
    refreshHistory,
    refreshAnalytics,
    requestPermission,
    testNotification
  };
};

export default usePushNotifications;