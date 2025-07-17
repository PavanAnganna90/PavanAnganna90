/**
 * Mock WebSocket Server for Development
 * 
 * Simulates real-time WebSocket connections for development purposes
 * when the actual backend WebSocket server is not available
 */

import { WebSocketMessage } from './websocketService';

export interface MockWebSocketServer {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

class MockWebSocketServerImpl implements MockWebSocketServer {
  private isActive = false;
  private intervals: NodeJS.Timeout[] = [];
  private messageHandlers: Set<(message: WebSocketMessage) => void> = new Set();

  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🚀 Mock WebSocket Server started for development');

    // Simulate system metrics updates every 5 seconds
    const systemMetricsInterval = setInterval(() => {
      if (!this.isActive) return;
      
      this.broadcast({
        type: 'system_metrics',
        payload: {
          system: {
            cpu: 45 + Math.random() * 40,
            memory: 50 + Math.random() * 30,
            network: 20 + Math.random() * 60,
            storage: 75 + Math.random() * 10,
            timestamp: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });
    }, 5000);

    // Simulate pipeline metrics updates every 10 seconds
    const pipelineMetricsInterval = setInterval(() => {
      if (!this.isActive) return;
      
      this.broadcast({
        type: 'pipeline_metrics',
        payload: {
          pipelines: {
            running: Math.floor(Math.random() * 5),
            success: 45 + Math.floor(Math.random() * 10),
            failed: Math.floor(Math.random() * 3),
            pending: Math.floor(Math.random() * 4)
          }
        },
        timestamp: new Date().toISOString()
      });
    }, 10000);

    // Simulate infrastructure metrics every 15 seconds
    const infraMetricsInterval = setInterval(() => {
      if (!this.isActive) return;
      
      this.broadcast({
        type: 'infrastructure_metrics',
        payload: {
          infrastructure: {
            nodes: {
              healthy: 11 + Math.floor(Math.random() * 2),
              total: 12
            },
            pods: {
              running: 240 + Math.floor(Math.random() * 20),
              total: 250
            }
          }
        },
        timestamp: new Date().toISOString()
      });
    }, 15000);

    // Simulate alert metrics every 20 seconds
    const alertMetricsInterval = setInterval(() => {
      if (!this.isActive) return;
      
      this.broadcast({
        type: 'alert_metrics',
        payload: {
          alerts: {
            critical: Math.floor(Math.random() * 3),
            warning: Math.floor(Math.random() * 8),
            info: Math.floor(Math.random() * 15)
          }
        },
        timestamp: new Date().toISOString()
      });
    }, 20000);

    // Simulate random events every 8-15 seconds
    const eventsInterval = setInterval(() => {
      if (!this.isActive) return;
      
      const eventTemplates = [
        {
          type: 'pipeline_event',
          templates: [
            { title: 'Build Started', message: 'Frontend build pipeline initiated', severity: 'info', type: 'pipeline' },
            { title: 'Deployment Complete', message: 'Production deployment successful', severity: 'success', type: 'deployment' },
            { title: 'Test Failed', message: 'Unit tests failed in auth-service', severity: 'error', type: 'pipeline' },
            { title: 'Build Success', message: 'Backend services build completed', severity: 'success', type: 'pipeline' }
          ]
        },
        {
          type: 'infrastructure_event',
          templates: [
            { title: 'Pod Scaled', message: 'Auto-scaled payment-service to 5 replicas', severity: 'info', type: 'infrastructure' },
            { title: 'Node Healthy', message: 'Worker node worker-3 is back online', severity: 'success', type: 'infrastructure' },
            { title: 'High Memory Usage', message: 'Node worker-1 memory usage at 85%', severity: 'warning', type: 'infrastructure' },
            { title: 'Storage Warning', message: 'Cluster storage usage above 80%', severity: 'warning', type: 'infrastructure' }
          ]
        },
        {
          type: 'system_event',
          templates: [
            { title: 'Security Scan', message: 'Vulnerability scan completed', severity: 'info', type: 'system' },
            { title: 'Backup Complete', message: 'Database backup finished successfully', severity: 'success', type: 'system' },
            { title: 'SSL Renewal', message: 'SSL certificate auto-renewed', severity: 'info', type: 'system' },
            { title: 'Rate Limit Hit', message: 'API rate limit threshold reached', severity: 'warning', type: 'system' }
          ]
        }
      ];

      const eventCategory = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
      const template = eventCategory.templates[Math.floor(Math.random() * eventCategory.templates.length)];

      this.broadcast({
        type: eventCategory.type,
        payload: {
          ...template,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        },
        timestamp: new Date().toISOString(),
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      });
    }, 8000 + Math.random() * 7000); // Random interval between 8-15 seconds

    // Simulate notifications every 30-60 seconds
    const notificationsInterval = setInterval(() => {
      if (!this.isActive) return;
      
      const notifications = [
        {
          type: 'alert',
          title: 'Performance Alert',
          message: 'Response time increased by 15% in the last 5 minutes',
          severity: 'warning'
        },
        {
          type: 'team',
          title: 'Team Update',
          message: 'Sarah deployed auth-service v2.1.5 to production',
          severity: 'info'
        },
        {
          type: 'system',
          title: 'Maintenance Window',
          message: 'Scheduled maintenance in 2 hours',
          severity: 'info'
        },
        {
          type: 'alert',
          title: 'Critical Alert',
          message: 'Database connection pool exhausted',
          severity: 'error',
          actionUrl: '/infrastructure'
        }
      ];

      const notification = notifications[Math.floor(Math.random() * notifications.length)];

      this.broadcast({
        type: 'notification',
        payload: notification,
        timestamp: new Date().toISOString(),
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      });
    }, 30000 + Math.random() * 30000); // Random interval between 30-60 seconds

    this.intervals = [
      systemMetricsInterval,
      pipelineMetricsInterval,
      infraMetricsInterval,
      alertMetricsInterval,
      eventsInterval,
      notificationsInterval
    ];
  }

  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.messageHandlers.clear();
    
    console.log('🛑 Mock WebSocket Server stopped');
  }

  isRunning(): boolean {
    return this.isActive;
  }

  private broadcast(message: WebSocketMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });
  }

  // Method to register message handlers (simulates WebSocket message events)
  addMessageHandler(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }
}

// Singleton instance
export const mockWebSocketServer = new MockWebSocketServerImpl();

// Auto-start in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Start the mock server after a short delay to ensure everything is initialized
  setTimeout(() => {
    if (!mockWebSocketServer.isRunning()) {
      mockWebSocketServer.start();
    }
  }, 1000);
}

export default mockWebSocketServer;