/**
 * Refactored WebSocket Service using Single Responsibility Principle
 * Coordinates between ConnectionManager, MessageQueue, and HeartbeatManager
 */

import { ConnectionManager, ConnectionOptions } from './ConnectionManager';
import { MessageQueue, QueuedMessage } from './MessageQueue';
import { HeartbeatManager } from './HeartbeatManager';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id?: string;
}

export interface WebSocketServiceOptions extends Omit<ConnectionOptions, 'onOpen' | 'onClose' | 'onError'> {
  heartbeatInterval?: number;
  queueOptions?: {
    maxQueueSize?: number;
    maxRetries?: number;
    batchSize?: number;
    batchTimeout?: number;
  };
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: (event: Event) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: (attempt: number) => void;
}

export class WebSocketService {
  private connectionManager: ConnectionManager;
  private messageQueue: MessageQueue;
  private heartbeatManager: HeartbeatManager;
  
  // Public event handlers for backward compatibility
  public onMessageHandler?: (message: WebSocketMessage) => void;
  public onOpenHandler?: (event: Event) => void;
  public onErrorHandler?: (error: Event) => void;
  public onCloseHandler?: (event: CloseEvent) => void;
  public onReconnectHandler?: (attempt: number) => void;

  constructor(options: WebSocketServiceOptions) {
    // Initialize message queue
    this.messageQueue = new MessageQueue(options.queueOptions);

    // Initialize heartbeat manager
    this.heartbeatManager = new HeartbeatManager({
      interval: options.heartbeatInterval || 30000,
      onTimeout: () => {
        console.error('Heartbeat timeout - reconnecting...');
        this.connectionManager.disconnect();
        this.connect();
      }
    });

    // Initialize connection manager with coordinated handlers
    this.connectionManager = new ConnectionManager({
      ...options,
      onOpen: (event) => {
        this.handleOpen(event);
        if (options.onOpen) options.onOpen(event);
      },
      onError: (error) => {
        this.handleError(error);
        if (options.onError) options.onError(error);
      },
      onClose: (event) => {
        this.handleClose(event);
        if (options.onClose) options.onClose(event);
      },
      onReconnect: (attempt) => {
        if (options.onReconnect) options.onReconnect(attempt);
      }
    });

    // Set up message handling
    this.onMessageHandler = options.onMessage;
    this.onOpenHandler = options.onOpen;
    this.onErrorHandler = options.onError;
    this.onCloseHandler = options.onClose;
    this.onReconnectHandler = options.onReconnect;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    await this.connectionManager.connect();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.heartbeatManager.stop();
    this.connectionManager.disconnect();
    this.messageQueue.clear();
  }

  /**
   * Send message to WebSocket server
   */
  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      id: message.id || this.generateMessageId()
    };

    const messageData = JSON.stringify(fullMessage);

    if (this.connectionManager.isConnected()) {
      const success = this.connectionManager.send(messageData);
      if (!success) {
        // Queue message if send failed
        this.messageQueue.enqueue(messageData);
      }
    } else {
      // Queue message if not connected
      this.messageQueue.enqueue(messageData);
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string): void {
    this.send({
      type: 'subscribe',
      payload: { messageType }
    });
  }

  /**
   * Unsubscribe from specific message types
   */
  unsubscribe(messageType: string): void {
    this.send({
      type: 'unsubscribe',
      payload: { messageType }
    });
  }

  /**
   * Get current connection state
   */
  getReadyState(): number {
    return this.connectionManager.getReadyState();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  /**
   * Get service health metrics
   */
  getHealthMetrics(): {
    connection: {
      isConnected: boolean;
      readyState: number;
    };
    queue: {
      queueLength: number;
      oldestMessage: number | null;
      failedMessages: number;
    };
    heartbeat: {
      isHealthy: boolean;
      lastPong: number;
      missedHeartbeats: number;
      timeSinceLastPong: number;
    };
  } {
    return {
      connection: {
        isConnected: this.connectionManager.isConnected(),
        readyState: this.connectionManager.getReadyState()
      },
      queue: this.messageQueue.getStats(),
      heartbeat: this.heartbeatManager.getHealthMetrics()
    };
  }

  private handleOpen(event: Event): void {
    console.log('WebSocket service connected');
    
    // Start heartbeat
    this.heartbeatManager.start(() => {
      return this.sendPing();
    });
    
    // Flush queued messages
    this.flushMessageQueue();
    
    // Call user handler
    if (this.onOpenHandler) {
      this.onOpenHandler(event);
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket service error:', error);
    
    if (this.onErrorHandler) {
      this.onErrorHandler(error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket service disconnected:', event.code, event.reason);
    
    // Stop heartbeat
    this.heartbeatManager.stop();
    
    if (this.onCloseHandler) {
      this.onCloseHandler(event);
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle internal messages
      if (message.type === 'pong') {
        this.heartbeatManager.handlePong();
        return;
      }
      
      // Call user handler
      if (this.onMessageHandler) {
        this.onMessageHandler(message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private sendPing(): boolean {
    const success = this.connectionManager.send(JSON.stringify({
      type: 'ping',
      timestamp: new Date().toISOString()
    }));
    
    return success;
  }

  private flushMessageQueue(): void {
    const messages = this.messageQueue.dequeue();
    
    for (const queuedMessage of messages) {
      const success = this.connectionManager.send(queuedMessage.data);
      
      if (success) {
        this.messageQueue.markSent(queuedMessage.id);
      } else {
        this.messageQueue.markFailed(queuedMessage.id);
        break; // Stop processing if connection is bad
      }
    }
  }

  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}