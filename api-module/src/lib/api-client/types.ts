import { z } from 'zod';

// Configuration types
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  };
  headers?: Record<string, string>;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  validateResponse?: boolean;
  params?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  ok: boolean;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  data?: any;
  originalError?: Error;
}

// Interceptor types
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;

// Retry configuration
export interface RetryConfig {
  attempt: number;
  error: Error;
  config: RequestConfig;
}

// Common API schemas
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number().min(0),
  totalPages: z.number().min(0),
});

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    errors: z.array(z.string()).optional(),
    pagination: PaginationSchema.optional(),
  });

export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

// Type helpers
export type Pagination = z.infer<typeof PaginationSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;