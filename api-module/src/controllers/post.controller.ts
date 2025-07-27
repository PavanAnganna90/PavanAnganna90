import { Request, Response, NextFunction } from 'express';
import { PostService } from '@/services/post.service';
import { ApiResponse } from '@/types/api';
import { AuthRequest } from '@/middleware/auth';
import {
  CreatePostInput,
  UpdatePostInput,
  GetPostInput,
  DeletePostInput,
  GetPostsInput,
} from '@/schemas/post.schema';

export class PostController {
  private postService: PostService;

  constructor() {
    this.postService = new PostService();
  }

  createPost = async (
    req: AuthRequest<{}, {}, CreatePostInput['body']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const post = await this.postService.createPost(req.user!.id, req.body);

      const response: ApiResponse = {
        success: true,
        data: post,
        message: 'Post created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getPost = async (
    req: Request<GetPostInput['params']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const post = await this.postService.getPostById(req.params.id);

      const response: ApiResponse = {
        success: true,
        data: post,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getPosts = async (
    req: Request<{}, {}, {}, GetPostsInput['query']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page, limit, published, authorId, search } = req.query;
      
      const result = await this.postService.getPosts(
        { published, authorId, search },
        { page, limit }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getPublishedPosts = async (
    req: Request<{}, {}, {}, Pick<GetPostsInput['query'], 'page' | 'limit'>>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page, limit } = req.query;
      
      const result = await this.postService.getPublishedPosts({ page, limit });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getMyPosts = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const posts = await this.postService.getUserPosts(req.user!.id);

      const response: ApiResponse = {
        success: true,
        data: posts,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  updatePost = async (
    req: AuthRequest<UpdatePostInput['params'], {}, UpdatePostInput['body']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'ADMIN';
      const post = await this.postService.updatePost(
        req.params.id,
        req.user!.id,
        req.body,
        isAdmin
      );

      const response: ApiResponse = {
        success: true,
        data: post,
        message: 'Post updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  deletePost = async (
    req: AuthRequest<DeletePostInput['params']>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'ADMIN';
      await this.postService.deletePost(req.params.id, req.user!.id, isAdmin);

      const response: ApiResponse = {
        success: true,
        message: 'Post deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  publishPost = async (
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'ADMIN';
      const post = await this.postService.publishPost(
        req.params.id,
        req.user!.id,
        isAdmin
      );

      const response: ApiResponse = {
        success: true,
        data: post,
        message: 'Post published successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  unpublishPost = async (
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const isAdmin = req.user!.role === 'ADMIN';
      const post = await this.postService.unpublishPost(
        req.params.id,
        req.user!.id,
        isAdmin
      );

      const response: ApiResponse = {
        success: true,
        data: post,
        message: 'Post unpublished successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  searchPosts = async (
    req: Request<{}, {}, {}, { q: string; page?: string; limit?: string; published?: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { q, page = '1', limit = '10', published = 'true' } = req.query;
      
      const result = await this.postService.searchPosts(
        q,
        { page: parseInt(page), limit: parseInt(limit) },
        published === 'true'
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}