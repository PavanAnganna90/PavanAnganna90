/**
 * Real-time WebSocket service for dashboard metrics
 * Provides live updates for system metrics, deployments, and alerts
 */

export interface RealtimeMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  cache_hit_rate: number;
  api_response_time: number;
}

export interface RealtimeDeployment {
  id: string;
  service: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  timestamp: string;
}

export interface RealtimeAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  source: string;
}

export type RealtimeEventType = 'metrics' | 'deployment' | 'alert' | 'health';

export interface RealtimeEvent {
  type: RealtimeEventType;
  data: RealtimeMetrics | RealtimeDeployment | RealtimeAlert | any;
  timestamp: string;
}

class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<RealtimeEventType, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';
    
    // Initialize event listener maps
    this.eventListeners.set('metrics', new Set());
    this.eventListeners.set('deployment', new Set());
    this.eventListeners.set('alert', new Set());
    this.eventListeners.set('health', new Set());
  }

  /**
   * Connect to WebSocket server
   */
  connect(authToken?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;
      
      const wsUrl = `${this.baseUrl}/ws/dashboard${authToken ? `?token=${authToken}` : ''}`;
      
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
            this.handleRealtimeEvent(realtimeEvent);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(eventType: RealtimeEventType, callback: (data: any) => void): () => void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(callback);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Send message to WebSocket server
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Message not sent:', message);
    }
  }

  /**
   * Request specific data updates
   */
  requestMetrics(): void {
    this.send({ type: 'request_metrics' });
  }

  requestDeploymentStatus(): void {
    this.send({ type: 'request_deployments' });
  }

  requestHealthStatus(): void {
    this.send({ type: 'request_health' });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }

  /**
   * Handle incoming real-time events
   */
  private handleRealtimeEvent(event: RealtimeEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event.data);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    setTimeout(() => {
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;