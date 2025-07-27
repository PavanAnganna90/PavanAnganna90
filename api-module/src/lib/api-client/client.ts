import { z } from 'zod';
import { 
  ApiClientConfig, 
  RequestConfig, 
  ApiResponse, 
  RequestInterceptor, 
  ResponseInterceptor 
} from './types';
import { ApiError, TimeoutError, ValidationError, NetworkError } from './errors';
import { RetryManager, RetryOptions } from './retry';

export class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultHeaders: Record<string, string>;
  private retryManager: RetryManager;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.defaultTimeout = config.timeout || 30000; // 30 seconds default
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    this.retryManager = new RetryManager(config.retries);
    
    if (config.interceptors?.request) {
      this.requestInterceptors = config.interceptors.request;
    }
    
    if (config.interceptors?.response) {
      this.responseInterceptors = config.interceptors.response;
    }
  }

  // Main HTTP methods
  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url: path });
  }

  async post<T>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url: path, body: data });
  }

  async put<T>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url: path, body: data });
  }

  async patch<T>(path: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url: path, body: data });
  }

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url: path });
  }

  // Core request method
  private async request<T>(config: RequestConfig & { url: string }): Promise<T> {
    const { url, params, validateResponse = true, retries, ...fetchConfig } = config;
    
    // Build full URL
    const fullUrl = this.buildUrl(url, params);
    
    // Prepare request config
    let requestConfig: RequestConfig = {
      ...fetchConfig,
      headers: {
        ...this.defaultHeaders,
        ...fetchConfig.headers,
      },
    };
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }
    
    // Convert body to JSON if needed
    if (requestConfig.body && typeof requestConfig.body === 'object' && !(requestConfig.body instanceof FormData)) {
      requestConfig.body = JSON.stringify(requestConfig.body);
    }
    
    // Execute request with retries
    const response = await this.retryManager.execute(
      () => this.executeRequest(fullUrl, requestConfig, config.timeout),
      { method: requestConfig.method, url: fullUrl }
    );
    
    return response.data;
  }

  private async executeRequest(url: string, config: RequestConfig, timeout?: number): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeoutMs = timeout || this.defaultTimeout;
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Parse response
      const contentType = response.headers.get('content-type');
      let data: any = null;
      
      if (contentType?.includes('application/json')) {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new ValidationError('Invalid JSON response', text);
          }
        }
      } else if (contentType?.includes('text/')) {
        data = await response.text();
      } else {
        data = await response.blob();
      }
      
      // Create API response
      let apiResponse: ApiResponse = {
        data,
        status: response.status,
        headers: response.headers,
        ok: response.ok,
      };
      
      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        apiResponse = await interceptor(apiResponse);
      }
      
      // Handle errors
      if (!response.ok) {
        throw ApiError.fromResponse(response, data);
      }
      
      return apiResponse;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new TimeoutError(timeoutMs);
        }
        
        if (error.message.includes('fetch')) {
          throw new NetworkError('Network request failed', error);
        }
      }
      
      throw error;
    }
  }

  private buildUrl(path: string, params?: Record<string, any>): string {
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;
    
    if (!params || Object.keys(params).length === 0) {
      return url;
    }
    
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  // Validation helper
  async requestWithValidation<T>(
    schema: z.ZodType<T>,
    request: () => Promise<any>
  ): Promise<T> {
    const response = await request();
    
    try {
      return schema.parse(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Response validation failed', error.errors);
      }
      throw error;
    }
  }

  // Interceptor management
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Configuration updates
  updateRetryOptions(options: Partial<RetryOptions>): void {
    this.retryManager.updateOptions(options);
  }

  setDefaultHeader(name: string, value: string): void {
    this.defaultHeaders[name] = value;
  }

  removeDefaultHeader(name: string): void {
    delete this.defaultHeaders[name];
  }
}