/**
 * WebSocket Message Queue
 * Handles message queuing when connection is down and batching for performance
 */

export interface QueuedMessage {
  id: string;
  data: string;
  timestamp: number;
  retries: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private maxQueueSize: number;
  private maxRetries: number;
  private batchSize: number;
  private batchTimeout: number;
  private batchTimer: NodeJS.Timeout | null = null;
  private pendingBatch: QueuedMessage[] = [];

  constructor(options: {
    maxQueueSize?: number;
    maxRetries?: number;
    batchSize?: number;
    batchTimeout?: number;
  } = {}) {
    this.maxQueueSize = options.maxQueueSize || 100;
    this.maxRetries = options.maxRetries || 3;
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 100; // ms
  }

  /**
   * Add message to queue
   */
  enqueue(data: string): string {
    const id = this.generateMessageId();
    const message: QueuedMessage = {
      id,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    // Remove oldest messages if queue is full
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }

    this.queue.push(message);
    return id;
  }

  /**
   * Get next batch of messages to send
   */
  dequeue(batchSize?: number): QueuedMessage[] {
    const size = batchSize || this.batchSize;
    return this.queue.splice(0, size);
  }

  /**
   * Mark message as failed and optionally retry
   */
  markFailed(messageId: string): boolean {
    const messageIndex = this.queue.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      return false;
    }

    const message = this.queue[messageIndex];
    message.retries++;

    if (message.retries >= this.maxRetries) {
      // Remove message after max retries
      this.queue.splice(messageIndex, 1);
      console.warn(`Message ${messageId} dropped after ${this.maxRetries} retries`);
      return false;
    }

    // Move to end of queue for retry
    this.queue.splice(messageIndex, 1);
    this.queue.push(message);
    return true;
  }

  /**
   * Remove message from queue (successful send)
   */
  markSent(messageId: string): boolean {
    const messageIndex = this.queue.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      this.queue.splice(messageIndex, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Get queue length
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Clear all queued messages
   */
  clear(): void {
    this.queue = [];
    this.pendingBatch = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    queueLength: number;
    oldestMessage: number | null;
    failedMessages: number;
  } {
    const now = Date.now();
    const oldestMessage = this.queue.length > 0 ? now - this.queue[0].timestamp : null;
    const failedMessages = this.queue.filter(msg => msg.retries > 0).length;

    return {
      queueLength: this.queue.length,
      oldestMessage,
      failedMessages
    };
  }

  /**
   * Batch messages for efficient sending
   */
  addToBatch(data: string, sendCallback: (messages: QueuedMessage[]) => void): void {
    const message: QueuedMessage = {
      id: this.generateMessageId(),
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.pendingBatch.push(message);

    // Send batch immediately if it reaches the batch size
    if (this.pendingBatch.length >= this.batchSize) {
      this.flushBatch(sendCallback);
      return;
    }

    // Schedule batch send if timer isn't already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch(sendCallback);
      }, this.batchTimeout);
    }
  }

  private flushBatch(sendCallback: (messages: QueuedMessage[]) => void): void {
    if (this.pendingBatch.length === 0) {
      return;
    }

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    sendCallback(batch);
  }

  private generateMessageId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}