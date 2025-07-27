import { Response } from 'express';
import { GitHubUserService } from '@/services/github-user.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { z } from 'zod';
import logger from '@/utils/logger';

const createRepoSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  private: z.boolean().default(false),
  auto_init: z.boolean().default(true),
  gitignore_template: z.string().optional(),
  license_template: z.string().optional(),
});

const searchReposSchema = z.object({
  q: z.string().min(1),
  sort: z.enum(['stars', 'forks', 'updated']).default('stars'),
  order: z.enum(['asc', 'desc']).default('desc'),
  per_page: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1),
});

const repoListSchema = z.object({
  type: z.enum(['all', 'owner', 'member']).default('owner'),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
  per_page: z.number().min(1).max(100).default(30),
  page: z.number().min(1).default(1),
});

export class GitHubController {
  private githubUserService = new GitHubUserService();

  /**
   * Get user's GitHub profile with repositories and stats
   */
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const profile = await this.githubUserService.getGitHubUserProfile(userId);
      
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error('Failed to get GitHub profile:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to fetch GitHub profile',
      });
    }
  }

  /**
   * Sync user data with GitHub
   */
  async syncProfile(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const syncResult = await this.githubUserService.syncUserWithGitHub(userId);
      
      res.json({
        success: true,
        data: syncResult,
      });
    } catch (error) {
      logger.error('Failed to sync GitHub profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync GitHub profile',
      });
    }
  }

  /**
   * Get user's repositories
   */
  async getRepositories(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const query = repoListSchema.parse(req.query);
      
      const repositories = await this.githubUserService.getUserRepositories(userId, {
        type: query.type,
        sort: query.sort,
        per_page: query.per_page,
        page: query.page,
      });
      
      res.json({
        success: true,
        data: {
          repositories,
          pagination: {
            page: query.page,
            per_page: query.per_page,
            total: repositories.length,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get repositories:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to fetch repositories',
      });
    }
  }

  /**
   * Get specific repository details
   */
  async getRepository(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      const { repoName } = req.params;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!repoName) {
        throw new AppError('Repository name is required', 400);
      }

      const repository = await this.githubUserService.getRepository(userId, repoName);
      
      res.json({
        success: true,
        data: repository,
      });
    } catch (error) {
      logger.error('Failed to get repository:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to fetch repository',
      });
    }
  }

  /**
   * Create a new repository
   */
  async createRepository(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const repoData = createRepoSchema.parse(req.body);
      
      const repository = await this.githubUserService.createRepository(userId, {
        name: repoData.name,
        description: repoData.description || undefined,
        private: repoData.private,
        auto_init: repoData.auto_init,
        gitignore_template: repoData.gitignore_template || undefined,
        license_template: repoData.license_template || undefined,
      });
      
      res.status(201).json({
        success: true,
        data: repository,
      });
    } catch (error) {
      logger.error('Failed to create repository:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create repository',
      });
    }
  }

  /**
   * Search GitHub repositories
   */
  async searchRepositories(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const query = searchReposSchema.parse(req.query);
      
      const searchResults = await this.githubUserService.searchRepositories(userId, query.q, {
        sort: query.sort,
        order: query.order,
        per_page: query.per_page,
        page: query.page,
      });
      
      res.json({
        success: true,
        data: {
          ...searchResults,
          pagination: {
            page: query.page,
            per_page: query.per_page,
            total: searchResults.total_count,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to search repositories:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid search parameters',
          details: error.errors,
        });
      }
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Repository search failed',
      });
    }
  }

  /**
   * Get user's GitHub activity summary
   */
  async getActivity(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const activity = await this.githubUserService.getUserActivity(userId);
      
      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      logger.error('Failed to get user activity:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user activity',
      });
    }
  }

  /**
   * Disconnect GitHub account
   */
  async disconnectGitHub(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      await this.githubUserService.disconnectGitHub(userId);
      
      res.json({
        success: true,
        message: 'GitHub account disconnected successfully',
      });
    } catch (error) {
      logger.error('Failed to disconnect GitHub:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect GitHub account',
      });
    }
  }

  /**
   * Validate GitHub connection
   */
  async validateConnection(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const validation = await this.githubUserService.validateGitHubConnection(userId);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      logger.error('Failed to validate GitHub connection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate GitHub connection',
      });
    }
  }
}