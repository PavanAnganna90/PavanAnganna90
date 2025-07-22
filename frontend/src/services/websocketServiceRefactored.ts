/**
 * Refactored WebSocket Services using modular architecture
 * Replaces the monolithic websocketService.ts with focused components
 */

import { WebSocketService } from './websocket/WebSocketService';

// Re-export types for backward compatibility
export { WebSocketMessage } from './websocket/WebSocketService';

/**
 * Metrics WebSocket Service - Focused on real-time metrics
 */
export class MetricsWebSocketService extends WebSocketService {
  constructor() {
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-domain.com/ws/metrics'
      : 'ws://localhost:8000/ws/metrics';

    super({
      url: wsUrl,
      heartbeatInterval: 30000,
      queueOptions: {
        maxQueueSize: 50,
        batchSize: 5
      },
      onOpen: () => {
        console.log('Metrics WebSocket connected');
        this.subscribe('system_metrics');
        this.subscribe('pipeline_events');
        this.subscribe('deployment_events');
        this.subscribe('infrastructure_events');
      },
      onError: (error) => {
        console.error('Metrics WebSocket error:', error);
      },
      onReconnect: (attempt) => {
        console.log(`Reconnecting to metrics WebSocket (attempt ${attempt})`);
      }
    });
  }
}

/**
 * Notifications WebSocket Service - Focused on user notifications
 */
export class NotificationsWebSocketService extends WebSocketService {
  constructor() {
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-domain.com/ws/notifications'
      : 'ws://localhost:8000/ws/notifications';

    super({
      url: wsUrl,
      heartbeatInterval: 45000, // Less frequent for notifications
      queueOptions: {
        maxQueueSize: 100,
        batchSize: 10
      },
      onOpen: () => {
        console.log('Notifications WebSocket connected');
        this.subscribe('alerts');
        this.subscribe('team_notifications');
        this.subscribe('system_notifications');
      },
      onError: (error) => {
        console.error('Notifications WebSocket error:', error);
      },
      onReconnect: (attempt) => {
        console.log(`Reconnecting to notifications WebSocket (attempt ${attempt})`);
      }
    });
  }
}

/**
 * WebSocket Manager - Centralized management of multiple connections
 */
export class WebSocketManager {
  private static instance: WebSocketManager;
  private services: Map<string, WebSocketService> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  register(name: string, service: WebSocketService): void {
    this.services.set(name, service);
  }

  get(name: string): WebSocketService | undefined {
    return this.services.get(name);
  }

  async connectAll(): Promise<void> {
    const connections = Array.from(this.services.entries()).map(([name, service]) => {
      console.log(`Connecting WebSocket: ${name}`);
      return service.connect();
    });

    await Promise.allSettled(connections);
  }

  disconnectAll(): void {
    this.services.forEach((service, name) => {
      console.log(`Disconnecting WebSocket: ${name}`);
      service.disconnect();
    });
  }

  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.services.forEach((service, name) => {
      status[name] = service.getHealthMetrics();
    });

    return status;
  }

  unregister(name: string): void {
    const service = this.services.get(name);
    if (service) {
      service.disconnect();
      this.services.delete(name);
    }
  }
}

// Create singleton instances
export const wsManager = WebSocketManager.getInstance();
export const metricsWS = new MetricsWebSocketService();
export const notificationsWS = new NotificationsWebSocketService();

// Register services
wsManager.register('metrics', metricsWS);
wsManager.register('notifications', notificationsWS);

// Auto-connect in browser environment
if (typeof window !== 'undefined') {
  // Connect after a short delay to allow for proper initialization
  setTimeout(() => {
    wsManager.connectAll().catch(error => {
      console.error('Failed to connect WebSocket services:', error);
    });
  }, 1000);
}