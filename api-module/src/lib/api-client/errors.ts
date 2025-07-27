export class ApiError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly data?: any;
  public readonly originalError?: Error;

  constructor(message: string, options?: {
    status?: number;
    code?: string;
    data?: any;
    originalError?: Error;
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.data = options?.data;
    this.originalError = options?.originalError;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static fromResponse(response: Response, data?: any): ApiError {
    const message = data?.error || data?.message || `Request failed with status ${response.status}`;
    return new ApiError(message, {
      status: response.status,
      code: data?.code,
      data,
    });
  }

  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (error instanceof Error) {
      return new ApiError(error.message, {
        originalError: error,
      });
    }

    return new ApiError('An unknown error occurred', {
      data: error,
    });
  }

  isRetryable(): boolean {
    // Network errors are retryable
    if (!this.status) return true;
    
    // 5xx errors are retryable
    if (this.status >= 500) return true;
    
    // 429 Too Many Requests is retryable
    if (this.status === 429) return true;
    
    // 408 Request Timeout is retryable
    if (this.status === 408) return true;
    
    return false;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      data: this.data,
    };
  }
}

export class TimeoutError extends ApiError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, {
      code: 'TIMEOUT',
    });
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, errors: any) {
    super(message, {
      code: 'VALIDATION_ERROR',
      data: errors,
    });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      code: 'NETWORK_ERROR',
      originalError,
    });
    this.name = 'NetworkError';
  }
}