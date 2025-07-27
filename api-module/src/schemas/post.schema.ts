import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    content: z.string().optional(),
    published: z.boolean().optional().default(false),
  }),
});

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid post ID format'),
  }),
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
    content: z.string().optional(),
    published: z.boolean().optional(),
  }),
});

export const getPostSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid post ID format'),
  }),
});

export const deletePostSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid post ID format'),
  }),
});

export const getPostsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    published: z.string().transform(val => val === 'true').optional(),
    authorId: z.string().cuid().optional(),
    search: z.string().optional(),
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type GetPostInput = z.infer<typeof getPostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type GetPostsInput = z.infer<typeof getPostsSchema>;