import { User } from '@prisma/client';
import { GitHubClient, GitHubUser, GitHubRepo } from '@/lib/api-client';
import { UserService } from '@/services/user.service';
import logger from '@/utils/logger';
import { AppError } from '@/middleware/errorHandler';

export interface GitHubUserProfile {
  user: Omit<User, 'password'>;
  githubProfile: GitHubUser;
  repositories: GitHubRepo[];
  stats: {
    totalRepos: number;
    totalStars: number;
    totalForks: number;
    languages: string[];
  };
}

export interface GitHubSyncResult {
  success: boolean;
  updated: boolean;
  changes: string[];
  error?: string;
}

export class GitHubUserService {
  private userService: UserService;
  private githubClient: GitHubClient;

  constructor() {
    this.userService = new UserService();
    this.githubClient = new GitHubClient();
  }

  /**
   * Get comprehensive GitHub user profile with repositories and stats
   */
  async getGitHubUserProfile(userId: string): Promise<GitHubUserProfile> {
    try {
      // Get user from database
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubLogin || !user.githubAccessToken) {
        throw new AppError('User is not connected to GitHub', 400);
      }

      // Set GitHub token
      this.githubClient.setAccessToken(user.githubAccessToken);

      // Fetch GitHub data in parallel
      const [githubProfile, repositories] = await Promise.all([
        this.githubClient.getCurrentUser(),
        this.githubClient.getUserRepos(user.githubLogin, {
          type: 'owner',
          sort: 'updated',
          per_page: 100
        })
      ]);

      // Calculate repository statistics
      const stats = this.calculateRepoStats(repositories);

      return {
        user,
        githubProfile,
        repositories,
        stats
      };

    } catch (error) {
      logger.error('Failed to get GitHub user profile:', error);
      throw new AppError('Failed to fetch GitHub profile', 500);
    }
  }

  /**
   * Sync user data with latest GitHub information
   */
  async syncUserWithGitHub(userId: string): Promise<GitHubSyncResult> {
    const changes: string[] = [];
    
    try {
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubLogin || !user.githubAccessToken) {
        return {
          success: false,
          updated: false,
          changes: [],
          error: 'User is not connected to GitHub'
        };
      }

      // Set GitHub token and fetch latest data
      this.githubClient.setAccessToken(user.githubAccessToken);
      const githubUser = await this.githubClient.getCurrentUser();

      // Check what needs updating
      const updates: any = {};

      if (user.name !== githubUser.name && githubUser.name) {
        updates.name = githubUser.name;
        changes.push(`Name updated to "${githubUser.name}"`);
      }

      if (user.avatar !== githubUser.avatar_url) {
        updates.avatar = githubUser.avatar_url;
        changes.push('Avatar updated');
      }

      if (user.company !== githubUser.company) {
        updates.company = githubUser.company;
        changes.push(`Company updated to "${githubUser.company || 'None'}"`);
      }

      if (user.location !== githubUser.location) {
        updates.location = githubUser.location;
        changes.push(`Location updated to "${githubUser.location || 'None'}"`);
      }

      if (user.bio !== githubUser.bio) {
        updates.bio = githubUser.bio;
        changes.push('Bio updated');
      }

      if (user.publicRepos !== githubUser.public_repos) {
        updates.publicRepos = githubUser.public_repos;
        changes.push(`Public repositories count updated to ${githubUser.public_repos}`);
      }

      if (user.followers !== githubUser.followers) {
        updates.followers = githubUser.followers;
        changes.push(`Followers count updated to ${githubUser.followers}`);
      }

      if (user.following !== githubUser.following) {
        updates.following = githubUser.following;
        changes.push(`Following count updated to ${githubUser.following}`);
      }

      // Update user if there are changes
      if (Object.keys(updates).length > 0) {
        await this.userService.update(userId, updates);
        logger.info('GitHub user sync completed', { userId, changes });
        
        return {
          success: true,
          updated: true,
          changes
        };
      }

      return {
        success: true,
        updated: false,
        changes: ['No changes detected']
      };

    } catch (error) {
      logger.error('Failed to sync user with GitHub:', error);
      return {
        success: false,
        updated: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's GitHub repositories with enhanced metadata
   */
  async getUserRepositories(userId: string, options?: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
    page?: number;
  }): Promise<GitHubRepo[]> {
    try {
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubLogin || !user.githubAccessToken) {
        throw new AppError('User is not connected to GitHub', 400);
      }

      this.githubClient.setAccessToken(user.githubAccessToken);
      
      return await this.githubClient.getUserRepos(user.githubLogin, {
        type: options?.type || 'owner',
        sort: options?.sort || 'updated',
        per_page: options?.per_page || 30,
        page: options?.page || 1
      });

    } catch (error) {
      logger.error('Failed to get user repositories:', error);
      throw new AppError('Failed to fetch repositories', 500);
    }
  }

  /**
   * Get repository details by name
   */
  async getRepository(userId: string, repoName: string): Promise<GitHubRepo> {
    try {
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubLogin || !user.githubAccessToken) {
        throw new AppError('User is not connected to GitHub', 400);
      }

      this.githubClient.setAccessToken(user.githubAccessToken);
      
      return await this.githubClient.getRepo(user.githubLogin, repoName);

    } catch (error) {
      logger.error('Failed to get repository:', error);
      throw new AppError('Repository not found', 404);
    }
  }

  /**
   * Create a new repository for the user
   */
  async createRepository(userId: string, repoData: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }): Promise<GitHubRepo> {
    try {
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubLogin || !user.githubAccessToken) {
        throw new AppError('User is not connected to GitHub', 400);
      }

      this.githubClient.setAccessToken(user.githubAccessToken);
      
      const repo = await this.githubClient.createRepo(repoData);
      
      // Sync user's repo count
      await this.syncUserWithGitHub(userId);
      
      logger.info('Repository created', { userId, repoName: repo.name });
      
      return repo;

    } catch (error) {
      logger.error('Failed to create repository:', error);
      throw new AppError('Failed to create repository', 500);
    }
  }

  /**
   * Search GitHub repositories
   */
  async searchRepositories(userId: string, query: string, options?: {
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<{ total_count: number; items: GitHubRepo[] }> {
    try {
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubAccessToken) {
        throw new AppError('User is not connected to GitHub', 400);
      }

      this.githubClient.setAccessToken(user.githubAccessToken);
      
      return await this.githubClient.searchRepositories(query, {
        sort: options?.sort || 'stars',
        order: options?.order || 'desc',
        per_page: options?.per_page || 20,
        page: options?.page || 1
      });

    } catch (error) {
      logger.error('Failed to search repositories:', error);
      throw new AppError('Repository search failed', 500);
    }
  }

  /**
   * Get GitHub user activity summary
   */
  async getUserActivity(userId: string): Promise<{
    repositoriesCount: number;
    recentRepositories: GitHubRepo[];
    languages: string[];
    totalStars: number;
    totalForks: number;
  }> {
    try {
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubLogin || !user.githubAccessToken) {
        throw new AppError('User is not connected to GitHub', 400);
      }

      this.githubClient.setAccessToken(user.githubAccessToken);
      
      // Get user's repositories
      const repositories = await this.githubClient.getUserRepos(user.githubLogin, {
        type: 'owner',
        sort: 'updated',
        per_page: 10
      });

      const stats = this.calculateRepoStats(repositories);

      return {
        repositoriesCount: user.publicRepos || 0,
        recentRepositories: repositories.slice(0, 5),
        languages: stats.languages,
        totalStars: stats.totalStars,
        totalForks: stats.totalForks
      };

    } catch (error) {
      logger.error('Failed to get user activity:', error);
      throw new AppError('Failed to fetch user activity', 500);
    }
  }

  /**
   * Disconnect GitHub account
   */
  async disconnectGitHub(userId: string): Promise<void> {
    try {
      await this.userService.update(userId, {
        githubId: null,
        githubLogin: null,
        githubAccessToken: null,
        avatar: null,
        company: null,
        location: null,
        bio: null,
        publicRepos: null,
        followers: null,
        following: null
      });

      logger.info('GitHub account disconnected', { userId });

    } catch (error) {
      logger.error('Failed to disconnect GitHub:', error);
      throw new AppError('Failed to disconnect GitHub account', 500);
    }
  }

  /**
   * Check if user's GitHub token is still valid
   */
  async validateGitHubConnection(userId: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      const user = await this.userService.getUserById(userId);
      
      if (!user.githubAccessToken) {
        return { isValid: false, error: 'No GitHub token found' };
      }

      this.githubClient.setAccessToken(user.githubAccessToken);
      
      // Try to fetch user data to validate token
      await this.githubClient.getCurrentUser();
      
      return { isValid: true };

    } catch (error) {
      logger.warn('GitHub token validation failed:', error);
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Token validation failed' 
      };
    }
  }

  /**
   * Calculate repository statistics
   */
  private calculateRepoStats(repositories: GitHubRepo[]): {
    totalRepos: number;
    totalStars: number;
    totalForks: number;
    languages: string[];
  } {
    const languages = new Set<string>();
    let totalStars = 0;
    let totalForks = 0;

    repositories.forEach(repo => {
      totalStars += repo.stargazers_count;
      totalForks += repo.forks_count;
      
      if (repo.language) {
        languages.add(repo.language);
      }
    });

    return {
      totalRepos: repositories.length,
      totalStars,
      totalForks,
      languages: Array.from(languages)
    };
  }
}