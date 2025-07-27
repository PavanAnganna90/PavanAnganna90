/**
 * Comprehensive API client with TypeScript types, JWT management, and error handling
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  ApiResponse,
  PaginatedResponse,
  User,
  Post,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateUserRequest,
  UpdateUserRequest,
  CreatePostRequest,
  UpdatePostRequest,
  UserQueryParams,
  PostQueryParams,
  DashboardStats,
  ActivityLog,
  ApiError,
  ChangePasswordRequest,
  RefreshTokenRequest
} from '@/types/api';

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize tokens from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(TOKEN_KEY);
      this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();
            if (this.token) {
              originalRequest.headers = {
                ...originalRequest.headers,
                Authorization: `Bearer ${this.token}`,
              };
              return this.client.request(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      timestamp: new Date().toISOString(),
    };

    if (error.response?.data) {
      const data = error.response.data as any;
      apiError.message = data.message || data.error || apiError.message;
      apiError.code = data.code || apiError.code;
      apiError.errors = data.errors;
    } else if (error.request) {
      apiError.message = 'Network error - please check your connection';
      apiError.code = 'NETWORK_ERROR';
    }

    return apiError;
  }

  // Token management methods
  public setTokens(token: string, refreshToken: string): void {
    this.token = token;
    this.refreshToken = refreshToken;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  public clearTokens(): void {
    this.token = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: this.refreshToken,
    });

    const { token, refreshToken } = response.data.data;
    this.setTokens(token, refreshToken);
  }

  // Authentication endpoints
  public async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    const { token, refreshToken } = response.data.data;
    this.setTokens(token, refreshToken);
    return response.data;
  }

  public async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    const { token, refreshToken } = response.data.data;
    this.setTokens(token, refreshToken);
    return response.data;
  }

  public async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  public async refreshToken(refreshTokenData: RefreshTokenRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/refresh', refreshTokenData);
    const { token, refreshToken } = response.data.data;
    this.setTokens(token, refreshToken);
    return response.data;
  }

  public async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>('/auth/change-password', passwordData);
    return response.data;
  }

  // User endpoints
  public async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    return response.data;
  }

  public async getUsers(params?: UserQueryParams): Promise<ApiResponse<PaginatedResponse<User>>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<User>>>('/users', { params });
    return response.data;
  }

  public async getUserById(id: string): Promise<ApiResponse<User>> {
    const response = await this.client.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  }

  public async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    const response = await this.client.post<ApiResponse<User>>('/users', userData);
    return response.data;
  }

  public async updateUser(id: string, userData: UpdateUserRequest): Promise<ApiResponse<User>> {
    const response = await this.client.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data;
  }

  public async deleteUser(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete<ApiResponse<void>>(`/users/${id}`);
    return response.data;
  }

  // Post endpoints
  public async getPosts(params?: PostQueryParams): Promise<ApiResponse<PaginatedResponse<Post>>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<Post>>>('/posts', { params });
    return response.data;
  }

  public async getPostById(id: string): Promise<ApiResponse<Post>> {
    const response = await this.client.get<ApiResponse<Post>>(`/posts/${id}`);
    return response.data;
  }

  public async createPost(postData: CreatePostRequest): Promise<ApiResponse<Post>> {
    const response = await this.client.post<ApiResponse<Post>>('/posts', postData);
    return response.data;
  }

  public async updatePost(id: string, postData: UpdatePostRequest): Promise<ApiResponse<Post>> {
    const response = await this.client.put<ApiResponse<Post>>(`/posts/${id}`, postData);
    return response.data;
  }

  public async deletePost(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete<ApiResponse<void>>(`/posts/${id}`);
    return response.data;
  }

  // Dashboard and analytics endpoints
  public async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await this.client.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data;
  }

  public async getActivityLogs(params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> {
    const response = await this.client.get<ApiResponse<PaginatedResponse<ActivityLog>>>('/dashboard/activity', { params });
    return response.data;
  }

  // File upload endpoint
  public async uploadFile(file: File, folder?: string): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const response = await this.client.post<ApiResponse<{ url: string; filename: string }>>(
      '/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  // Health check endpoint
  public async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    const response = await this.client.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
    return response.data;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export the class for testing purposes
export { ApiClient };

// Utility functions for common operations
export const api = {
  // Auth operations
  auth: {
    login: (credentials: LoginRequest) => apiClient.login(credentials),
    register: (userData: RegisterRequest) => apiClient.register(userData),
    logout: () => apiClient.logout(),
    getCurrentUser: () => apiClient.getCurrentUser(),
    changePassword: (passwordData: ChangePasswordRequest) => apiClient.changePassword(passwordData),
    isAuthenticated: () => apiClient.isAuthenticated(),
  },

  // User operations
  users: {
    getAll: (params?: UserQueryParams) => apiClient.getUsers(params),
    getById: (id: string) => apiClient.getUserById(id),
    create: (userData: CreateUserRequest) => apiClient.createUser(userData),
    update: (id: string, userData: UpdateUserRequest) => apiClient.updateUser(id, userData),
    delete: (id: string) => apiClient.deleteUser(id),
  },

  // Post operations
  posts: {
    getAll: (params?: PostQueryParams) => apiClient.getPosts(params),
    getById: (id: string) => apiClient.getPostById(id),
    create: (postData: CreatePostRequest) => apiClient.createPost(postData),
    update: (id: string, postData: UpdatePostRequest) => apiClient.updatePost(id, postData),
    delete: (id: string) => apiClient.deletePost(id),
  },

  // Dashboard operations
  dashboard: {
    getStats: () => apiClient.getDashboardStats(),
    getActivityLogs: (params?: { page?: number; limit?: number }) => apiClient.getActivityLogs(params),
  },

  // Utility operations
  upload: (file: File, folder?: string) => apiClient.uploadFile(file, folder),
  healthCheck: () => apiClient.healthCheck(),
};