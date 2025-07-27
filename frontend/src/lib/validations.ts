/**
 * Zod validation schemas for forms
 */
import { z } from 'zod';
import { UserRole, PostStatus } from '@/types/api';

// Authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be at most 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be at most 50 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User management schemas
export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be at most 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be at most 50 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  role: z.nativeEnum(UserRole).optional(),
});

export const updateUserSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  firstName: z
    .string()
    .max(50, 'First name must be at most 50 characters')
    .optional(),
  lastName: z
    .string()
    .max(50, 'Last name must be at most 50 characters')
    .optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

// Post management schemas
export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be at most 50,000 characters'),
  excerpt: z
    .string()
    .max(500, 'Excerpt must be at most 500 characters')
    .optional(),
  status: z.nativeEnum(PostStatus).optional(),
  featuredImage: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string())
    .max(10, 'You can add at most 10 tags')
    .optional(),
  categories: z
    .array(z.string())
    .max(5, 'You can add at most 5 categories')
    .optional(),
  publishedAt: z
    .string()
    .datetime('Please enter a valid date and time')
    .optional()
    .or(z.literal('')),
});

export const updatePostSchema = z.object({
  title: z
    .string()
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  content: z
    .string()
    .max(50000, 'Content must be at most 50,000 characters')
    .optional(),
  excerpt: z
    .string()
    .max(500, 'Excerpt must be at most 500 characters')
    .optional(),
  status: z.nativeEnum(PostStatus).optional(),
  featuredImage: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string())
    .max(10, 'You can add at most 10 tags')
    .optional(),
  categories: z
    .array(z.string())
    .max(5, 'You can add at most 5 categories')
    .optional(),
  publishedAt: z
    .string()
    .datetime('Please enter a valid date and time')
    .optional()
    .or(z.literal('')),
});

// Search and filter schemas
export const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email', 'username']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export const postFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(PostStatus).optional(),
  authorId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  sortBy: z.enum(['createdAt', 'publishedAt', 'title', 'viewCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// Type inference from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type CreatePostFormData = z.infer<typeof createPostSchema>;
export type UpdatePostFormData = z.infer<typeof updatePostSchema>;
export type UserFiltersData = z.infer<typeof userFiltersSchema>;
export type PostFiltersData = z.infer<typeof postFiltersSchema>;