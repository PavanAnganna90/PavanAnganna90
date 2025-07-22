/**
 * WebSocket Connection Manager
 * Handles connection lifecycle, authentication, and reconnection logic
 */

export interface ConnectionOptions {
  url: string;
  protocols?: string[];
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onOpen?: (event: Event) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: (attempt: number) => void;
}

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string[];
  private maxReconnectAttempts: number;
  private reconnectInterval: number;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private isManualClose: boolean = false;

  // Event handlers
  public onOpenHandler?: (event: Event) => void;
  public onErrorHandler?: (error: Event) => void;
  public onCloseHandler?: (event: CloseEvent) => void;
  public onReconnectHandler?: (attempt: number) => void;

  constructor(options: ConnectionOptions) {
    this.url = options.url;
    this.protocols = options.protocols;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectInterval = options.reconnectInterval || 3000;
    
    this.onOpenHandler = options.onOpen;
    this.onErrorHandler = options.onError;
    this.onCloseHandler = options.onClose;
    this.onReconnectHandler = options.onReconnect;
  }

  /**
   * Connect to WebSocket server with secure authentication
   */
  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isManualClose = false;

    try {
      // Get secure WebSocket token
      const token = await this.getAuthToken();
      
      // Use secure subprotocol for authentication
      const protocols = token ? [...(this.protocols || []), `token.${token}`] : this.protocols;
      
      this.ws = new WebSocket(this.url, protocols);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Send raw message to WebSocket
   */
  send(data: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(data);
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get current connection state
   */
  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Set message handler
   */
  setMessageHandler(handler: (event: MessageEvent) => void): void {
    if (this.ws) {
      this.ws.onmessage = handler;
    }
  }

  private handleOpen(event: Event): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    if (this.onOpenHandler) {
      this.onOpenHandler(event);
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.isConnecting = false;
    
    if (this.onErrorHandler) {
      this.onErrorHandler(error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    
    if (this.onCloseHandler) {
      this.onCloseHandler(event);
    }
    
    // Schedule reconnect if not manually closed
    if (!this.isManualClose && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.onReconnectHandler) {
        this.onReconnectHandler(this.reconnectAttempts);
      }
      this.connect();
    }, delay);
  }

  private async getAuthToken(): Promise<string | null> {
    if (typeof window !== 'undefined') {
      try {
        const { authService } = await import('../../lib/auth');
        return authService.getWebSocketToken();
      } catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
      }
    }
    return null;
  }
}