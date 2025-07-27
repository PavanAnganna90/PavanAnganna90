/**
 * Comprehensive TypeScript types for Express.js API integration
 */

// Base API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface CreateUserRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Post types
export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  status: PostStatus;
  featuredImage?: string;
  tags: string[];
  categories: string[];
  authorId: string;
  author: User;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  commentCount: number;
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export interface CreatePostRequest {
  title: string;
  content: string;
  excerpt?: string;
  status?: PostStatus;
  featuredImage?: string;
  tags?: string[];
  categories?: string[];
  publishedAt?: string;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: PostStatus;
  featuredImage?: string;
  tags?: string[];
  categories?: string[];
  publishedAt?: string;
}

// Query parameters for filtering and pagination
export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'username';
  sortOrder?: 'asc' | 'desc';
}

export interface PostQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PostStatus;
  authorId?: string;
  tags?: string[];
  categories?: string[];
  sortBy?: 'createdAt' | 'publishedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
}

// Error types
export interface ApiError {
  message: string;
  code: string;
  status: number;
  errors?: Record<string, string[]>;
  timestamp: string;
}

// Dashboard analytics types
export interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  posts: {
    total: number;
    published: number;
    drafts: number;
    thisMonth: number;
  };
  engagement: {
    totalViews: number;
    totalComments: number;
    avgViewsPerPost: number;
    topPosts: Post[];
  };
}

export interface ActivityLog {
  id: string;
  userId: string;
  user: User;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// Permission types for RBAC
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  payload: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    userId?: string;
    read: boolean;
    createdAt: string;
  };
}

// Form validation schemas support
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// File upload types
export interface FileUploadResponse {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  categories?: string[];
  status?: string[];
  users?: string[];
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// Table configuration types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[];
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  pagination?: boolean;
  defaultSort?: SortConfig;
  defaultPageSize?: number;
}