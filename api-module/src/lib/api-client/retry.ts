import { ApiError } from './errors';
import { RetryConfig } from './types';

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  shouldRetry?: (error: ApiError, attempt: number) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
};

export class RetryManager {
  private options: RetryOptions;

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
  }

  async execute<T>(
    operation: () => Promise<T>,
    context?: { method?: string; url?: string }
  ): Promise<T> {
    let lastError: ApiError | undefined;
    
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = ApiError.fromError(error);
        
        // Check if we should retry
        if (attempt === this.options.maxAttempts) {
          break;
        }
        
        if (!this.shouldRetry(lastError, attempt)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        
        console.log(
          `Retry attempt ${attempt}/${this.options.maxAttempts} for ${context?.method} ${context?.url} after ${delay}ms`
        );
        
        await this.sleep(delay);
      }
    }
    
    // All retries exhausted
    throw lastError;
  }

  private shouldRetry(error: ApiError, attempt: number): boolean {
    // Use custom retry logic if provided
    if (this.options.shouldRetry) {
      return this.options.shouldRetry(error, attempt);
    }
    
    // Default retry logic
    return error.isRetryable();
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.options.initialDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5);
    
    return Math.min(delayWithJitter, this.options.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateOptions(options: Partial<RetryOptions>): void {
    this.options = { ...this.options, ...options };
  }
}