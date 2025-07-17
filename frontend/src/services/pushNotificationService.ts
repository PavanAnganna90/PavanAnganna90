/**
 * Push Notification Service
 * 
 * Comprehensive push notification system:
 * - Service Worker registration and management
 * - Push subscription handling
 * - Notification payload management
 * - Background sync for offline notifications
 * - Rich notification support (actions, images, etc.)
 * - Notification scheduling and batching
 * - Analytics and delivery tracking
 * - Cross-platform compatibility
 */

import { format, addMinutes } from 'date-fns';

export interface PushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string;
  deviceType: 'mobile' | 'desktop';
  userAgent: string;
  subscriptionTime: Date;
  lastSeen: Date;
  active: boolean;
}

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
  category: NotificationCategory;
  targetUsers?: string[];
  targetGroups?: string[];
  scheduledTime?: Date;
  expiryTime?: Date;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
  type?: 'button' | 'text';
  placeholder?: string;
}

export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sound: string;
  vibration: number[];
  defaultEnabled: boolean;
  canDisable: boolean;
  priority: 'high' | 'normal' | 'low';
}

export interface NotificationSettings {
  enabled: boolean;
  categories: Record<string, boolean>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  batchingEnabled: boolean;
  maxBatchSize: number;
  batchDelay: number;
  showOnLockScreen: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface NotificationDeliveryStatus {
  id: string;
  notificationId: string;
  subscriptionId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  avgDeliveryTime: number;
  topCategories: Array<{ category: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  timeDistribution: Array<{ hour: number; count: number }>;
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'alerts',
    name: 'Critical Alerts',
    description: 'System failures, security incidents, and urgent issues',
    icon: '🚨',
    color: '#EF4444',
    sound: 'alert',
    vibration: [200, 100, 200],
    defaultEnabled: true,
    canDisable: false,
    priority: 'high'
  },
  {
    id: 'deployments',
    name: 'Deployments',
    description: 'Deployment status updates and notifications',
    icon: '🚀',
    color: '#3B82F6',
    sound: 'notification',
    vibration: [100],
    defaultEnabled: true,
    canDisable: true,
    priority: 'normal'
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    description: 'Performance metrics and health checks',
    icon: '📊',
    color: '#10B981',
    sound: 'subtle',
    vibration: [50],
    defaultEnabled: true,
    canDisable: true,
    priority: 'low'
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security events and compliance notifications',
    icon: '🔒',
    color: '#F59E0B',
    sound: 'security',
    vibration: [100, 50, 100],
    defaultEnabled: true,
    canDisable: false,
    priority: 'high'
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    description: 'Team updates, mentions, and comments',
    icon: '👥',
    color: '#8B5CF6',
    sound: 'chat',
    vibration: [50],
    defaultEnabled: true,
    canDisable: true,
    priority: 'normal'
  },
  {
    id: 'system',
    name: 'System Updates',
    description: 'Maintenance, updates, and system notifications',
    icon: '⚙️',
    color: '#6B7280',
    sound: 'system',
    vibration: [50],
    defaultEnabled: false,
    canDisable: true,
    priority: 'low'
  }
];

export class PushNotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscription | null = null;
  private settings: NotificationSettings;
  private pendingNotifications: NotificationPayload[] = [];
  private deliveryStatusMap: Map<string, NotificationDeliveryStatus> = new Map();

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadSettings();
  }

  // Initialize the service
  async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported in this browser');
    }

    if (!('Notification' in window)) {
      throw new Error('Web notifications are not supported in this browser');
    }

    // Register service worker
    await this.registerServiceWorker();

    // Load existing subscription
    await this.loadExistingSubscription();

    // Set up message handlers
    this.setupMessageHandlers();
  }

  // Register service worker
  private async registerServiceWorker(): Promise<void> {
    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Load existing subscription
  private async loadExistingSubscription(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (subscription) {
        this.pushSubscription = await this.convertToPushSubscription(subscription);
      }
    } catch (error) {
      console.error('Failed to load existing subscription:', error);
    }
  }

  // Request permission and subscribe to push notifications
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Subscribe to push notifications
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not registered');
    }

    const permission = await this.requestPermission();
    if (!permission) {
      throw new Error('Push notification permission denied');
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      this.pushSubscription = await this.convertToPushSubscription(subscription);
      
      // Register subscription with server
      await this.registerSubscriptionWithServer(this.pushSubscription);
      
      return this.pushSubscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Unregister from server
        if (this.pushSubscription) {
          await this.unregisterSubscriptionFromServer(this.pushSubscription.id);
        }
      }

      this.pushSubscription = null;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Send notification
  async sendNotification(payload: Omit<NotificationPayload, 'id' | 'timestamp'>): Promise<string> {
    const notification: NotificationPayload = {
      ...payload,
      id: this.generateId(),
      timestamp: new Date()
    };

    // Check if notification should be sent now or scheduled
    if (notification.scheduledTime && notification.scheduledTime > new Date()) {
      await this.scheduleNotification(notification);
      return notification.id;
    }

    // Apply settings filters
    if (!this.shouldSendNotification(notification)) {
      return notification.id;
    }

    try {
      await this.sendNotificationToServer(notification);
      return notification.id;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Send notification to server
  private async sendNotificationToServer(notification: NotificationPayload): Promise<void> {
    const response = await fetch('/api/v1/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(notification)
    });

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.status}`);
    }
  }

  // Schedule notification
  private async scheduleNotification(notification: NotificationPayload): Promise<void> {
    const delay = notification.scheduledTime!.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.sendNotification(notification);
      }, delay);
    }
  }

  // Check if notification should be sent based on settings
  private shouldSendNotification(notification: NotificationPayload): boolean {
    if (!this.settings.enabled) return false;

    // Check category settings
    if (!this.settings.categories[notification.category.id]) return false;

    // Check quiet hours
    if (this.settings.quietHours.enabled) {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const { start, end } = this.settings.quietHours;
      
      if (start < end) {
        if (currentTime >= start && currentTime <= end) return false;
      } else {
        if (currentTime >= start || currentTime <= end) return false;
      }
    }

    // Check expiry
    if (notification.expiryTime && notification.expiryTime < new Date()) {
      return false;
    }

    return true;
  }

  // Show local notification
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      image: payload.image,
      tag: payload.tag || payload.id,
      data: {
        id: payload.id,
        timestamp: payload.timestamp.toISOString(),
        ...payload.data
      },
      actions: payload.actions?.map(action => ({
        action: action.action,
        title: action.title,
        icon: action.icon
      })),
      requireInteraction: payload.priority === 'high',
      silent: !this.settings.soundEnabled,
      vibrate: this.settings.vibrationEnabled ? payload.category.vibration : undefined,
      timestamp: payload.timestamp.getTime()
    };

    const notification = new Notification(payload.title, options);

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      this.handleNotificationClick(payload);
      notification.close();
    };

    // Auto-close after delay for non-critical notifications
    if (payload.priority !== 'high') {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // Handle notification click
  private async handleNotificationClick(payload: NotificationPayload): Promise<void> {
    // Track click event
    await this.trackNotificationEvent(payload.id, 'click');

    // Handle different notification types
    switch (payload.category.id) {
      case 'alerts':
        window.open(`/alerts/${payload.data?.alertId}`, '_blank');
        break;
      case 'deployments':
        window.open(`/deployments/${payload.data?.deploymentId}`, '_blank');
        break;
      case 'monitoring':
        window.open(`/monitoring/${payload.data?.metricId}`, '_blank');
        break;
      case 'security':
        window.open(`/security/${payload.data?.incidentId}`, '_blank');
        break;
      case 'collaboration':
        window.open(`/collaboration/${payload.data?.threadId}`, '_blank');
        break;
      default:
        window.open('/', '_blank');
    }
  }

  // Track notification events
  private async trackNotificationEvent(notificationId: string, event: string): Promise<void> {
    try {
      await fetch('/api/v1/notifications/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          notificationId,
          event,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to track notification event:', error);
    }
  }

  // Get notification settings
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Update notification settings
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Update server settings
    await this.updateServerSettings();
  }

  // Get notification categories
  getCategories(): NotificationCategory[] {
    return [...NOTIFICATION_CATEGORIES];
  }

  // Get notification history
  async getNotificationHistory(limit: number = 50): Promise<NotificationPayload[]> {
    try {
      const response = await fetch(`/api/v1/notifications/history?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notification history: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  // Get notification analytics
  async getAnalytics(timeRange: string = '24h'): Promise<NotificationAnalytics> {
    try {
      const response = await fetch(`/api/v1/notifications/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notification analytics: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        avgDeliveryTime: 0,
        topCategories: [],
        deviceBreakdown: {},
        timeDistribution: []
      };
    }
  }

  // Private helper methods
  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      categories: NOTIFICATION_CATEGORIES.reduce((acc, cat) => {
        acc[cat.id] = cat.defaultEnabled;
        return acc;
      }, {} as Record<string, boolean>),
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      batchingEnabled: true,
      maxBatchSize: 5,
      batchDelay: 300000, // 5 minutes
      showOnLockScreen: true,
      soundEnabled: true,
      vibrationEnabled: true
    };
  }

  private loadSettings(): void {
    const saved = localStorage.getItem('pushNotificationSettings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    }
  }

  private saveSettings(): void {
    localStorage.setItem('pushNotificationSettings', JSON.stringify(this.settings));
  }

  private async updateServerSettings(): Promise<void> {
    try {
      await fetch('/api/v1/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(this.settings)
      });
    } catch (error) {
      console.error('Failed to update server settings:', error);
    }
  }

  private async convertToPushSubscription(subscription: any): Promise<PushSubscription> {
    const keys = subscription.getKey ? {
      p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: this.arrayBufferToBase64(subscription.getKey('auth'))
    } : subscription.keys;

    return {
      id: this.generateId(),
      endpoint: subscription.endpoint,
      keys,
      userId: this.getCurrentUserId(),
      deviceType: this.getDeviceType(),
      userAgent: navigator.userAgent,
      subscriptionTime: new Date(),
      lastSeen: new Date(),
      active: true
    };
  }

  private async registerSubscriptionWithServer(subscription: PushSubscription): Promise<void> {
    const response = await fetch('/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      throw new Error(`Failed to register subscription: ${response.status}`);
    }
  }

  private async unregisterSubscriptionFromServer(subscriptionId: string): Promise<void> {
    await fetch(`/api/v1/notifications/unsubscribe/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });
  }

  private setupMessageHandlers(): void {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'NOTIFICATION_CLICKED') {
        this.handleNotificationClick(event.data.payload);
      }
    });
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string {
    // Get from auth context or localStorage
    return localStorage.getItem('userId') || 'anonymous';
  }

  private getDeviceType(): 'mobile' | 'desktop' {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      ? 'mobile' 
      : 'desktop';
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.unsubscribe();
    this.pendingNotifications = [];
    this.deliveryStatusMap.clear();
  }
}

export const pushNotificationService = new PushNotificationService();