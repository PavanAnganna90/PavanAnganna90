import { Response } from 'express';
import { GitHubUserService } from '@/services/github-user.service';
import { UserService } from '@/services/user.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

export interface DashboardStats {
  totalUsers: number;
  connectedGitHubUsers: number;
  totalRepositories: number;
  totalStars: number;
  totalForks: number;
  topLanguages: Array<{ language: string; count: number }>;
  recentActivity: Array<{
    type: 'user_joined' | 'repo_created' | 'github_connected';
    user: string;
    timestamp: Date;
    details?: string;
  }>;
}

export interface UserDashboard {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    githubConnected: boolean;
  };
  github?: {
    profile: any;
    repositories: any[];
    stats: {
      totalRepos: number;
      totalStars: number;
      totalForks: number;
      languages: string[];
    };
    activity: any;
  };
  summary: {
    joinedAt: Date;
    lastActive: Date;
    repositoriesCount: number;
    contributionsThisMonth: number;
  };
}

export class DashboardController {
  private githubUserService = new GitHubUserService();
  private userService = new UserService();

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Get platform-wide statistics
      const [usersData, currentUser] = await Promise.all([
        this.userService.getUsers({ page: 1, limit: 1000 }),
        this.userService.getUserById(userId)
      ]);

      const users = usersData.users;
      const connectedGitHubUsers = users.filter(user => user.githubLogin).length;

      // Calculate aggregate GitHub stats
      let totalRepositories = 0;
      let totalStars = 0;
      let totalForks = 0;
      const languageCount: Record<string, number> = {};

      for (const user of users) {
        if (user.publicRepos) totalRepositories += user.publicRepos;
        // Note: Individual star/fork counts would need to be stored separately
        // For now, we'll use placeholder logic
      }

      const topLanguages = Object.entries(languageCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([language, count]) => ({ language, count }));

      // Mock recent activity (in production, this would come from an activity log)
      const recentActivity = users
        .slice(0, 5)
        .map(user => ({
          type: 'user_joined' as const,
          user: user.name || user.email,
          timestamp: user.createdAt,
          details: user.githubLogin ? `Connected with GitHub as @${user.githubLogin}` : undefined,
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const stats: DashboardStats = {
        totalUsers: users.length,
        connectedGitHubUsers,
        totalRepositories,
        totalStars,
        totalForks,
        topLanguages,
        recentActivity,
      };

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Dashboard stats error:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics',
      });
    }
  }

  /**
   * Get personalized user dashboard
   */
  async getUserDashboard(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await this.userService.getUserById(userId);
      const isGitHubConnected = !!(user.githubLogin && user.githubAccessToken);

      const dashboard: UserDashboard = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || undefined,
          githubConnected: isGitHubConnected,
        },
        summary: {
          joinedAt: user.createdAt,
          lastActive: user.updatedAt,
          repositoriesCount: user.publicRepos || 0,
          contributionsThisMonth: 0, // Would be calculated from GitHub API or activity logs
        },
      };

      // Add GitHub data if connected
      if (isGitHubConnected) {
        try {
          const [githubProfile, githubActivity] = await Promise.all([
            this.githubUserService.getGitHubUserProfile(userId),
            this.githubUserService.getUserActivity(userId).catch(() => null),
          ]);

          dashboard.github = {
            profile: githubProfile.githubProfile,
            repositories: githubProfile.repositories.slice(0, 10), // Latest 10 repos
            stats: githubProfile.stats,
            activity: githubActivity,
          };
        } catch (error) {
          logger.warn('Failed to fetch GitHub data for dashboard:', error);
          // Continue without GitHub data
        }
      }

      return res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      logger.error('User dashboard error:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user dashboard',
      });
    }
  }

  /**
   * Get GitHub repository insights for dashboard
   */
  async getRepositoryInsights(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await this.userService.getUserById(userId);
      if (!user.githubLogin || !user.githubAccessToken) {
        return res.status(400).json({
          success: false,
          error: 'GitHub account not connected',
        });
      }

      const repositories = await this.githubUserService.getUserRepositories(userId, {
        sort: 'updated',
        per_page: 20,
      });

      // Calculate insights
      const insights = {
        totalRepositories: repositories.length,
        languages: [...new Set(repositories.map(repo => repo.language).filter(Boolean))],
        mostStarred: repositories
          .sort((a, b) => b.stargazers_count - a.stargazers_count)
          .slice(0, 5),
        recentlyUpdated: repositories
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5),
        totalStars: repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0),
        totalForks: repositories.reduce((sum, repo) => sum + repo.forks_count, 0),
        languageStats: repositories.reduce((stats, repo) => {
          if (repo.language) {
            stats[repo.language] = (stats[repo.language] || 0) + 1;
          }
          return stats;
        }, {} as Record<string, number>),
      };

      return res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      logger.error('Repository insights error:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch repository insights',
      });
    }
  }

  /**
   * Get activity timeline for dashboard
   */
  async getActivityTimeline(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await this.userService.getUserById(userId);
      
      // Build activity timeline
      const timeline = [];

      // Add user registration
      timeline.push({
        type: 'user_registered',
        timestamp: user.createdAt,
        title: 'Joined the platform',
        description: 'Welcome to the community!',
      });

      // Add GitHub connection if applicable
      if (user.githubLogin) {
        timeline.push({
          type: 'github_connected',
          timestamp: user.updatedAt, // Approximation
          title: 'Connected GitHub account',
          description: `Connected as @${user.githubLogin}`,
          metadata: {
            githubLogin: user.githubLogin,
            avatar: user.avatar,
          },
        });
      }

      // Add repository data if available
      if (user.githubLogin && user.githubAccessToken) {
        try {
          const repositories = await this.githubUserService.getUserRepositories(userId, {
            sort: 'created',
            per_page: 5,
          });

          repositories.forEach(repo => {
            timeline.push({
              type: 'repository_created',
              timestamp: new Date(repo.created_at),
              title: `Created repository: ${repo.name}`,
              description: repo.description || 'No description provided',
              metadata: {
                repositoryName: repo.name,
                language: repo.language,
                stars: repo.stargazers_count,
                isPrivate: repo.private,
              },
            });
          });
        } catch (error) {
          logger.warn('Failed to fetch repositories for timeline:', error);
        }
      }

      // Sort timeline by timestamp (newest first)
      timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return res.json({
        success: true,
        data: {
          timeline: timeline.slice(0, 20), // Latest 20 activities
          total: timeline.length,
        },
      });
    } catch (error) {
      logger.error('Activity timeline error:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch activity timeline',
      });
    }
  }
}