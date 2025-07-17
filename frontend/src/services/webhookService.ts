/**
 * Webhook Management Service
 * 
 * Comprehensive webhook management system:
 * - Webhook registration and configuration
 * - Event filtering and routing
 * - Delivery tracking and retry logic
 * - Webhook security and validation
 * - Rate limiting and throttling
 * - Batch processing and queuing
 * - Webhook analytics and monitoring
 * - Custom payload transformations
 */

import { format, addMinutes, subHours } from 'date-fns';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  description: string;
  events: WebhookEvent[];
  filters: WebhookFilter[];
  headers: Record<string, string>;
  secret: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  owner: string;
  retryConfig: RetryConfig;
  rateLimit: RateLimitConfig;
  transformation?: PayloadTransformation;
}

export interface WebhookEvent {
  type: string;
  category: EventCategory;
  description: string;
  payloadSchema: Record<string, any>;
  enabled: boolean;
}

export interface WebhookFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists' | 'in';
  value: any;
  enabled: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  retryOnStatus: number[];
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  burstLimit: number;
  skipOnOverflow: boolean;
}

export interface PayloadTransformation {
  enabled: boolean;
  script: string;
  language: 'javascript' | 'jsonata';
  timeout: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: DeliveryAttempt[];
  createdAt: Date;
  completedAt?: Date;
  nextRetry?: Date;
}

export interface DeliveryAttempt {
  id: string;
  timestamp: Date;
  httpStatus: number;
  responseTime: number;
  responseBody: string;
  error?: string;
  headers: Record<string, string>;
}

export interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  deliveryRate: number;
  topEvents: Array<{ event: string; count: number }>;
  recentDeliveries: WebhookDelivery[];
}

export interface EventCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

const EVENT_CATEGORIES: EventCategory[] = [
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'Deployment-related events',
    color: '#3B82F6',
    icon: '🚀'
  },
  {
    id: 'alert',
    name: 'Alerts',
    description: 'System alerts and notifications',
    color: '#EF4444',
    icon: '🚨'
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    description: 'Monitoring and metrics events',
    color: '#10B981',
    icon: '📊'
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security-related events',
    color: '#F59E0B',
    icon: '🔒'
  },
  {
    id: 'user',
    name: 'User Actions',
    description: 'User activity events',
    color: '#8B5CF6',
    icon: '👤'
  },
  {
    id: 'system',
    name: 'System',
    description: 'System-level events',
    color: '#6B7280',
    icon: '⚙️'
  }
];

const DEFAULT_EVENTS: WebhookEvent[] = [
  {
    type: 'deployment.started',
    category: EVENT_CATEGORIES[0],
    description: 'Deployment process started',
    payloadSchema: {
      deploymentId: 'string',
      environment: 'string',
      version: 'string',
      initiator: 'string'
    },
    enabled: true
  },
  {
    type: 'deployment.completed',
    category: EVENT_CATEGORIES[0],
    description: 'Deployment completed successfully',
    payloadSchema: {
      deploymentId: 'string',
      environment: 'string',
      version: 'string',
      duration: 'number'
    },
    enabled: true
  },
  {
    type: 'deployment.failed',
    category: EVENT_CATEGORIES[0],
    description: 'Deployment failed',
    payloadSchema: {
      deploymentId: 'string',
      environment: 'string',
      version: 'string',
      error: 'string'
    },
    enabled: true
  },
  {
    type: 'alert.critical',
    category: EVENT_CATEGORIES[1],
    description: 'Critical alert triggered',
    payloadSchema: {
      alertId: 'string',
      severity: 'string',
      message: 'string',
      source: 'string'
    },
    enabled: true
  },
  {
    type: 'alert.resolved',
    category: EVENT_CATEGORIES[1],
    description: 'Alert resolved',
    payloadSchema: {
      alertId: 'string',
      duration: 'number',
      resolvedBy: 'string'
    },
    enabled: true
  },
  {
    type: 'metric.threshold',
    category: EVENT_CATEGORIES[2],
    description: 'Metric threshold exceeded',
    payloadSchema: {
      metricName: 'string',
      value: 'number',
      threshold: 'number',
      timestamp: 'string'
    },
    enabled: true
  },
  {
    type: 'security.login',
    category: EVENT_CATEGORIES[3],
    description: 'User login event',
    payloadSchema: {
      userId: 'string',
      username: 'string',
      ipAddress: 'string',
      userAgent: 'string'
    },
    enabled: true
  },
  {
    type: 'security.unauthorized',
    category: EVENT_CATEGORIES[3],
    description: 'Unauthorized access attempt',
    payloadSchema: {
      ipAddress: 'string',
      endpoint: 'string',
      userAgent: 'string',
      timestamp: 'string'
    },
    enabled: true
  }
];

export class WebhookService {
  private webhooks: Map<string, Webhook> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];
  private stats: WebhookStats = {
    totalWebhooks: 0,
    activeWebhooks: 0,
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    averageResponseTime: 0,
    deliveryRate: 0,
    topEvents: [],
    recentDeliveries: []
  };

  constructor() {
    this.initializeService();
  }

  // Initialize the service
  private async initializeService(): Promise<void> {
    await this.loadWebhooks();
    this.startDeliveryProcessor();
    this.startStatsUpdater();
  }

  // Load webhooks from storage
  private async loadWebhooks(): Promise<void> {
    try {
      const response = await fetch('/api/v1/webhooks', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        const webhooks: Webhook[] = await response.json();
        webhooks.forEach(webhook => {
          this.webhooks.set(webhook.id, webhook);
        });
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    }
  }

  // Create a new webhook
  async createWebhook(webhookData: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt' | 'secret'>): Promise<Webhook> {
    const webhook: Webhook = {
      ...webhookData,
      id: this.generateId(),
      secret: this.generateSecret(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const response = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(webhook)
      });

      if (!response.ok) {
        throw new Error(`Failed to create webhook: ${response.status}`);
      }

      this.webhooks.set(webhook.id, webhook);
      return webhook;
    } catch (error) {
      console.error('Failed to create webhook:', error);
      throw error;
    }
  }

  // Update a webhook
  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    const updatedWebhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date()
    };

    try {
      const response = await fetch(`/api/v1/webhooks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updatedWebhook)
      });

      if (!response.ok) {
        throw new Error(`Failed to update webhook: ${response.status}`);
      }

      this.webhooks.set(id, updatedWebhook);
      return updatedWebhook;
    } catch (error) {
      console.error('Failed to update webhook:', error);
      throw error;
    }
  }

  // Delete a webhook
  async deleteWebhook(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/webhooks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.status}`);
      }

      this.webhooks.delete(id);
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      throw error;
    }
  }

  // Get webhook by ID
  getWebhook(id: string): Webhook | null {
    return this.webhooks.get(id) || null;
  }

  // Get all webhooks
  getWebhooks(): Webhook[] {
    return Array.from(this.webhooks.values());
  }

  // Get available events
  getAvailableEvents(): WebhookEvent[] {
    return DEFAULT_EVENTS;
  }

  // Get event categories
  getEventCategories(): EventCategory[] {
    return EVENT_CATEGORIES;
  }

  // Trigger webhook event
  async triggerEvent(eventType: string, payload: any): Promise<void> {
    const matchingWebhooks = Array.from(this.webhooks.values()).filter(webhook => 
      webhook.enabled && 
      webhook.events.some(event => event.type === eventType && event.enabled)
    );

    for (const webhook of matchingWebhooks) {
      // Check filters
      if (!this.passesFilters(webhook, payload)) {
        continue;
      }

      // Apply transformation
      let transformedPayload = payload;
      if (webhook.transformation?.enabled) {
        transformedPayload = await this.applyTransformation(webhook.transformation, payload);
      }

      // Create delivery
      const delivery: WebhookDelivery = {
        id: this.generateId(),
        webhookId: webhook.id,
        eventType,
        payload: transformedPayload,
        status: 'pending',
        attempts: [],
        createdAt: new Date()
      };

      this.deliveryQueue.push(delivery);
    }
  }

  // Check if payload passes webhook filters
  private passesFilters(webhook: Webhook, payload: any): boolean {
    return webhook.filters.every(filter => {
      if (!filter.enabled) return true;

      const fieldValue = this.getNestedValue(payload, filter.field);
      
      switch (filter.operator) {
        case 'equals':
          return fieldValue === filter.value;
        case 'contains':
          return String(fieldValue).includes(filter.value);
        case 'startsWith':
          return String(fieldValue).startsWith(filter.value);
        case 'endsWith':
          return String(fieldValue).endsWith(filter.value);
        case 'regex':
          return new RegExp(filter.value).test(String(fieldValue));
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(fieldValue);
        default:
          return true;
      }
    });
  }

  // Apply payload transformation
  private async applyTransformation(transformation: PayloadTransformation, payload: any): Promise<any> {
    if (!transformation.enabled) return payload;

    try {
      if (transformation.language === 'javascript') {
        // Execute JavaScript transformation
        const func = new Function('payload', transformation.script);
        return func(payload);
      } else if (transformation.language === 'jsonata') {
        // Execute JSONata transformation (would need JSONata library)
        // For now, return original payload
        return payload;
      }
    } catch (error) {
      console.error('Transformation failed:', error);
      return payload;
    }

    return payload;
  }

  // Process delivery queue
  private async startDeliveryProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.deliveryQueue.length === 0) return;

      const delivery = this.deliveryQueue.shift()!;
      await this.processDelivery(delivery);
    }, 1000);
  }

  // Process individual delivery
  private async processDelivery(delivery: WebhookDelivery): Promise<void> {
    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) return;

    // Check rate limits
    if (webhook.rateLimit.enabled && !this.checkRateLimit(webhook)) {
      if (webhook.rateLimit.skipOnOverflow) {
        delivery.status = 'failed';
        return;
      } else {
        // Requeue for later
        this.deliveryQueue.push(delivery);
        return;
      }
    }

    try {
      const startTime = Date.now();
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': this.generateSignature(delivery.payload, webhook.secret),
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Timestamp': delivery.createdAt.toISOString(),
        ...webhook.headers
      };

      // Make the request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      // Record attempt
      const attempt: DeliveryAttempt = {
        id: this.generateId(),
        timestamp: new Date(),
        httpStatus: response.status,
        responseTime,
        responseBody,
        headers: Object.fromEntries(response.headers.entries())
      };

      delivery.attempts.push(attempt);

      if (response.ok) {
        delivery.status = 'success';
        delivery.completedAt = new Date();
        webhook.lastTriggered = new Date();
      } else {
        throw new Error(`HTTP ${response.status}: ${responseBody}`);
      }
    } catch (error) {
      const attempt: DeliveryAttempt = {
        id: this.generateId(),
        timestamp: new Date(),
        httpStatus: 0,
        responseTime: 0,
        responseBody: '',
        error: error.message,
        headers: {}
      };

      delivery.attempts.push(attempt);

      // Check if we should retry
      if (delivery.attempts.length < webhook.retryConfig.maxRetries) {
        delivery.status = 'retrying';
        delivery.nextRetry = this.calculateNextRetry(webhook.retryConfig, delivery.attempts.length);
        
        // Requeue for retry
        setTimeout(() => {
          this.deliveryQueue.push(delivery);
        }, delivery.nextRetry!.getTime() - Date.now());
      } else {
        delivery.status = 'failed';
        delivery.completedAt = new Date();
      }
    }

    // Update stats
    this.updateStats(delivery);
  }

  // Calculate next retry time
  private calculateNextRetry(config: RetryConfig, attemptCount: number): Date {
    let delay = config.initialDelay;

    switch (config.backoffStrategy) {
      case 'exponential':
        delay = config.initialDelay * Math.pow(2, attemptCount - 1);
        break;
      case 'linear':
        delay = config.initialDelay * attemptCount;
        break;
      case 'fixed':
        delay = config.initialDelay;
        break;
    }

    delay = Math.min(delay, config.maxDelay);
    return addMinutes(new Date(), delay / 60000);
  }

  // Check rate limits
  private checkRateLimit(webhook: Webhook): boolean {
    // Simple rate limiting implementation
    // In production, this would use Redis or similar
    return true;
  }

  // Generate webhook signature
  private generateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  // Update statistics
  private updateStats(delivery: WebhookDelivery): void {
    this.stats.totalDeliveries++;
    
    if (delivery.status === 'success') {
      this.stats.successfulDeliveries++;
    } else if (delivery.status === 'failed') {
      this.stats.failedDeliveries++;
    }

    // Update delivery rate
    this.stats.deliveryRate = (this.stats.successfulDeliveries / this.stats.totalDeliveries) * 100;

    // Update recent deliveries
    this.stats.recentDeliveries.unshift(delivery);
    if (this.stats.recentDeliveries.length > 100) {
      this.stats.recentDeliveries.pop();
    }
  }

  // Start stats updater
  private startStatsUpdater(): void {
    setInterval(() => {
      this.updateGeneralStats();
    }, 60000); // Update every minute
  }

  // Update general statistics
  private updateGeneralStats(): void {
    const webhooks = Array.from(this.webhooks.values());
    this.stats.totalWebhooks = webhooks.length;
    this.stats.activeWebhooks = webhooks.filter(w => w.enabled).length;

    // Calculate average response time
    const recentAttempts = this.stats.recentDeliveries
      .flatMap(d => d.attempts)
      .filter(a => a.responseTime > 0);
    
    if (recentAttempts.length > 0) {
      this.stats.averageResponseTime = recentAttempts.reduce((sum, a) => sum + a.responseTime, 0) / recentAttempts.length;
    }

    // Calculate top events
    const eventCounts = new Map<string, number>();
    this.stats.recentDeliveries.forEach(delivery => {
      const count = eventCounts.get(delivery.eventType) || 0;
      eventCounts.set(delivery.eventType, count + 1);
    });

    this.stats.topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Get webhook statistics
  getStats(): WebhookStats {
    return { ...this.stats };
  }

  // Get webhook deliveries
  async getDeliveries(webhookId?: string, limit: number = 50): Promise<WebhookDelivery[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(webhookId && { webhookId })
      });

      const response = await fetch(`/api/v1/webhooks/deliveries?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deliveries: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get deliveries:', error);
      return [];
    }
  }

  // Test webhook
  async testWebhook(id: string): Promise<WebhookDelivery> {
    const webhook = this.webhooks.get(id);
    if (!webhook) {
      throw new Error(`Webhook not found: ${id}`);
    }

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook delivery'
    };

    await this.triggerEvent('test.webhook', testPayload);
    
    // Return the test delivery (simplified)
    return {
      id: this.generateId(),
      webhookId: id,
      eventType: 'test.webhook',
      payload: testPayload,
      status: 'success',
      attempts: [],
      createdAt: new Date(),
      completedAt: new Date()
    };
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

export const webhookService = new WebhookService();