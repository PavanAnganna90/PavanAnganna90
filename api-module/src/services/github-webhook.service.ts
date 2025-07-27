import { GitHubUserService } from '@/services/github-user.service';
import { UserService } from '@/services/user.service';
import logger from '@/utils/logger';
import { z } from 'zod';

// GitHub webhook event schemas
const GitHubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  description: z.string().nullable(),
  html_url: z.string(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  forks_count: z.number(),
  language: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string().nullable(),
});

const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  avatar_url: z.string(),
  html_url: z.string(),
});

const PushEventSchema = z.object({
  ref: z.string(),
  before: z.string(),
  after: z.string(),
  commits: z.array(z.object({
    id: z.string(),
    message: z.string(),
    timestamp: z.string(),
    author: z.object({
      name: z.string(),
      email: z.string(),
    }),
  })),
  repository: GitHubRepositorySchema,
  pusher: GitHubUserSchema,
  sender: GitHubUserSchema,
});

const RepositoryEventSchema = z.object({
  action: z.enum(['created', 'deleted', 'archived', 'unarchived', 'edited', 'renamed', 'transferred', 'publicized', 'privatized']),
  repository: GitHubRepositorySchema,
  sender: GitHubUserSchema,
});

const StarEventSchema = z.object({
  action: z.enum(['created', 'deleted']),
  starred_at: z.string().nullable(),
  repository: GitHubRepositorySchema,
  sender: GitHubUserSchema,
});

const ForkEventSchema = z.object({
  forkee: GitHubRepositorySchema,
  repository: GitHubRepositorySchema,
  sender: GitHubUserSchema,
});

const IssuesEventSchema = z.object({
  action: z.enum(['opened', 'closed', 'reopened', 'edited', 'assigned', 'unassigned', 'labeled', 'unlabeled']),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.enum(['open', 'closed']),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: GitHubUserSchema,
  }),
  repository: GitHubRepositorySchema,
  sender: GitHubUserSchema,
});

const PullRequestEventSchema = z.object({
  action: z.enum(['opened', 'closed', 'reopened', 'edited', 'assigned', 'unassigned', 'review_requested', 'review_request_removed', 'labeled', 'unlabeled', 'synchronize']),
  number: z.number(),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.enum(['open', 'closed']),
    merged: z.boolean(),
    html_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: GitHubUserSchema,
    head: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
    base: z.object({
      ref: z.string(),
      sha: z.string(),
    }),
  }),
  repository: GitHubRepositorySchema,
  sender: GitHubUserSchema,
});

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  userUpdated?: boolean;
  error?: string;
}

export class GitHubWebhookService {
  private githubUserService = new GitHubUserService();
  private userService = new UserService();

  /**
   * Process GitHub webhook events
   */
  async processWebhook(
    eventType: string,
    payload: any,
    signature?: string
  ): Promise<WebhookProcessingResult> {
    try {
      // Validate webhook signature if provided
      if (signature && !this.validateSignature(payload, signature)) {
        return {
          success: false,
          message: 'Invalid webhook signature',
          error: 'Signature validation failed',
        };
      }

      // Process different event types
      switch (eventType) {
        case 'push':
          return await this.handlePushEvent(payload);
        case 'repository':
          return await this.handleRepositoryEvent(payload);
        case 'star':
          return await this.handleStarEvent(payload);
        case 'fork':
          return await this.handleForkEvent(payload);
        case 'issues':
          return await this.handleIssuesEvent(payload);
        case 'pull_request':
          return await this.handlePullRequestEvent(payload);
        case 'ping':
          return this.handlePingEvent(payload);
        default:
          logger.info(`Unhandled webhook event type: ${eventType}`);
          return {
            success: true,
            message: `Event type ${eventType} received but not processed`,
          };
      }
    } catch (error) {
      logger.error('Webhook processing error:', error);
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle push events
   */
  private async handlePushEvent(payload: any): Promise<WebhookProcessingResult> {
    try {
      const event = PushEventSchema.parse(payload);
      
      // Find user by GitHub login
      const user = await this.findUserByGitHubLogin(event.pusher.login);
      if (!user) {
        return {
          success: true,
          message: 'Push event processed, but user not found in system',
        };
      }

      // Log the push activity
      logger.info('GitHub push event processed', {
        userId: user.id,
        repository: event.repository.full_name,
        commits: event.commits.length,
        ref: event.ref,
      });

      // Optionally trigger user sync for updated repository statistics
      if (event.commits.length > 0) {
        await this.githubUserService.syncUserWithGitHub(user.id);
      }

      return {
        success: true,
        message: 'Push event processed successfully',
        userUpdated: event.commits.length > 0,
      };
    } catch (error) {
      logger.error('Push event processing error:', error);
      return {
        success: false,
        message: 'Failed to process push event',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle repository events (created, deleted, etc.)
   */
  private async handleRepositoryEvent(payload: any): Promise<WebhookProcessingResult> {
    try {
      const event = RepositoryEventSchema.parse(payload);
      
      const user = await this.findUserByGitHubLogin(event.sender.login);
      if (!user) {
        return {
          success: true,
          message: 'Repository event processed, but user not found in system',
        };
      }

      logger.info('GitHub repository event processed', {
        userId: user.id,
        action: event.action,
        repository: event.repository.full_name,
      });

      // Sync user data for repository count changes
      if (['created', 'deleted'].includes(event.action)) {
        await this.githubUserService.syncUserWithGitHub(user.id);
      }

      return {
        success: true,
        message: `Repository ${event.action} event processed successfully`,
        userUpdated: ['created', 'deleted'].includes(event.action),
      };
    } catch (error) {
      logger.error('Repository event processing error:', error);
      return {
        success: false,
        message: 'Failed to process repository event',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle star events
   */
  private async handleStarEvent(payload: any): Promise<WebhookProcessingResult> {
    try {
      const event = StarEventSchema.parse(payload);
      
      // Find the repository owner
      const repoOwner = event.repository.full_name.split('/')[0];
      const user = await this.findUserByGitHubLogin(repoOwner);
      
      if (!user) {
        return {
          success: true,
          message: 'Star event processed, but repository owner not found in system',
        };
      }

      logger.info('GitHub star event processed', {
        userId: user.id,
        action: event.action,
        repository: event.repository.full_name,
        starrer: event.sender.login,
      });

      // Sync user data for updated star counts
      await this.githubUserService.syncUserWithGitHub(user.id);

      return {
        success: true,
        message: `Star ${event.action} event processed successfully`,
        userUpdated: true,
      };
    } catch (error) {
      logger.error('Star event processing error:', error);
      return {
        success: false,
        message: 'Failed to process star event',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle fork events
   */
  private async handleForkEvent(payload: any): Promise<WebhookProcessingResult> {
    try {
      const event = ForkEventSchema.parse(payload);
      
      // Find the original repository owner
      const repoOwner = event.repository.full_name.split('/')[0];
      const user = await this.findUserByGitHubLogin(repoOwner);
      
      if (!user) {
        return {
          success: true,
          message: 'Fork event processed, but repository owner not found in system',
        };
      }

      logger.info('GitHub fork event processed', {
        userId: user.id,
        repository: event.repository.full_name,
        fork: event.forkee.full_name,
        forker: event.sender.login,
      });

      // Sync user data for updated fork counts
      await this.githubUserService.syncUserWithGitHub(user.id);

      return {
        success: true,
        message: 'Fork event processed successfully',
        userUpdated: true,
      };
    } catch (error) {
      logger.error('Fork event processing error:', error);
      return {
        success: false,
        message: 'Failed to process fork event',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle issues events
   */
  private async handleIssuesEvent(payload: any): Promise<WebhookProcessingResult> {
    try {
      const event = IssuesEventSchema.parse(payload);
      
      const user = await this.findUserByGitHubLogin(event.sender.login);
      if (!user) {
        return {
          success: true,
          message: 'Issues event processed, but user not found in system',
        };
      }

      logger.info('GitHub issues event processed', {
        userId: user.id,
        action: event.action,
        repository: event.repository.full_name,
        issueNumber: event.issue.number,
        issueTitle: event.issue.title,
      });

      return {
        success: true,
        message: `Issues ${event.action} event processed successfully`,
      };
    } catch (error) {
      logger.error('Issues event processing error:', error);
      return {
        success: false,
        message: 'Failed to process issues event',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle pull request events
   */
  private async handlePullRequestEvent(payload: any): Promise<WebhookProcessingResult> {
    try {
      const event = PullRequestEventSchema.parse(payload);
      
      const user = await this.findUserByGitHubLogin(event.sender.login);
      if (!user) {
        return {
          success: true,
          message: 'Pull request event processed, but user not found in system',
        };
      }

      logger.info('GitHub pull request event processed', {
        userId: user.id,
        action: event.action,
        repository: event.repository.full_name,
        prNumber: event.pull_request.number,
        prTitle: event.pull_request.title,
      });

      return {
        success: true,
        message: `Pull request ${event.action} event processed successfully`,
      };
    } catch (error) {
      logger.error('Pull request event processing error:', error);
      return {
        success: false,
        message: 'Failed to process pull request event',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle ping events (webhook verification)
   */
  private handlePingEvent(payload: any): WebhookProcessingResult {
    logger.info('GitHub webhook ping received', {
      hookId: payload.hook_id,
      zen: payload.zen,
    });

    return {
      success: true,
      message: 'Webhook ping received successfully',
    };
  }

  /**
   * Find user by GitHub login
   */
  private async findUserByGitHubLogin(githubLogin: string) {
    try {
      return await this.userService.findByGitHubLogin(githubLogin);
    } catch (error) {
      logger.error('Error finding user by GitHub login:', error);
      return null;
    }
  }

  /**
   * Validate webhook signature (for security)
   */
  private validateSignature(payload: any, signature: string): boolean {
    // Implementation would depend on your webhook secret configuration
    // For now, return true for development
    // In production, validate using HMAC-SHA256 with your webhook secret
    return true;
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<{
    totalEvents: number;
    eventTypes: Record<string, number>;
    lastProcessed?: Date;
  }> {
    // This could be enhanced with database tracking
    return {
      totalEvents: 0,
      eventTypes: {},
      lastProcessed: new Date(),
    };
  }
}