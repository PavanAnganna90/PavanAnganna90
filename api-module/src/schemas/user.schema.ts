import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain lowercase, uppercase, and number'),
    role: z.enum(['USER', 'ADMIN']).optional().default('USER'),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
  body: z.object({
    email: z.string().email('Invalid email format').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
  }),
});

export const getUserSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
});

export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID format'),
  }),
});

export const getUsersSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    role: z.enum(['USER', 'ADMIN']).optional(),
    search: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type GetUserInput = z.infer<typeof getUserSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
export type GetUsersInput = z.infer<typeof getUsersSchema>;
export type LoginInput = z.infer<typeof loginSchema>;