/**
 * WebSocket Heartbeat Manager
 * Handles connection health monitoring and keep-alive functionality
 */

export interface HeartbeatOptions {
  interval?: number;
  timeout?: number;
  onTimeout?: () => void;
  onPong?: () => void;
}

export class HeartbeatManager {
  private interval: number;
  private timeout: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastPong: number = 0;
  private missedHeartbeats: number = 0;
  private maxMissedHeartbeats: number = 3;

  // Event handlers
  private onTimeoutHandler?: () => void;
  private onPongHandler?: () => void;

  constructor(options: HeartbeatOptions = {}) {
    this.interval = options.interval || 30000; // 30 seconds
    this.timeout = options.timeout || 5000; // 5 seconds
    this.onTimeoutHandler = options.onTimeout;
    this.onPongHandler = options.onPong;
  }

  /**
   * Start heartbeat monitoring
   */
  start(sendPing: () => boolean): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.missedHeartbeats = 0;
    this.lastPong = Date.now();

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(sendPing);
    }, this.interval);
  }

  /**
   * Stop heartbeat monitoring
   */
  stop(): void {
    this.isRunning = false;
    this.missedHeartbeats = 0;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  /**
   * Handle pong response
   */
  handlePong(): void {
    this.lastPong = Date.now();
    this.missedHeartbeats = 0;

    // Clear timeout timer
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    if (this.onPongHandler) {
      this.onPongHandler();
    }
  }

  /**
   * Get connection health metrics
   */
  getHealthMetrics(): {
    isHealthy: boolean;
    lastPong: number;
    missedHeartbeats: number;
    timeSinceLastPong: number;
  } {
    const now = Date.now();
    const timeSinceLastPong = now - this.lastPong;
    const isHealthy = this.missedHeartbeats < this.maxMissedHeartbeats;

    return {
      isHealthy,
      lastPong: this.lastPong,
      missedHeartbeats: this.missedHeartbeats,
      timeSinceLastPong
    };
  }

  /**
   * Check if heartbeat is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Update heartbeat configuration
   */
  updateConfig(options: Partial<HeartbeatOptions>): void {
    if (options.interval !== undefined) {
      this.interval = options.interval;
    }
    if (options.timeout !== undefined) {
      this.timeout = options.timeout;
    }
    if (options.onTimeout !== undefined) {
      this.onTimeoutHandler = options.onTimeout;
    }
    if (options.onPong !== undefined) {
      this.onPongHandler = options.onPong;
    }

    // Restart heartbeat with new configuration if currently running
    if (this.isRunning) {
      this.stop();
      // Note: start() would need to be called again by the parent service
    }
  }

  private sendHeartbeat(sendPing: () => boolean): void {
    // Clear any existing timeout timer
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }

    // Send ping
    const success = sendPing();
    
    if (!success) {
      this.handleHeartbeatFailure();
      return;
    }

    // Set timeout for pong response
    this.timeoutTimer = setTimeout(() => {
      this.handleHeartbeatTimeout();
    }, this.timeout);
  }

  private handleHeartbeatTimeout(): void {
    this.missedHeartbeats++;
    
    console.warn(`Heartbeat timeout (${this.missedHeartbeats}/${this.maxMissedHeartbeats})`);

    if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
      console.error('Connection appears to be dead - max heartbeat timeouts reached');
      
      if (this.onTimeoutHandler) {
        this.onTimeoutHandler();
      }
    }
  }

  private handleHeartbeatFailure(): void {
    console.error('Failed to send heartbeat ping');
    this.missedHeartbeats++;

    if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
      if (this.onTimeoutHandler) {
        this.onTimeoutHandler();
      }
    }
  }
}