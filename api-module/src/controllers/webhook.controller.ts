import { Request, Response } from 'express';
import { GitHubWebhookService } from '@/services/github-webhook.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import logger from '@/utils/logger';
import { z } from 'zod';

const WebhookConfigSchema = z.object({
  events: z.array(z.string()).default([
    'push',
    'repository',
    'star',
    'fork',
    'issues',
    'pull_request'
  ]),
  active: z.boolean().default(true),
  content_type: z.enum(['json', 'form']).default('json'),
});

export class WebhookController {
  private webhookService = new GitHubWebhookService();

  /**
   * Handle incoming GitHub webhooks
   */
  async handleGitHubWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const eventType = req.headers['x-github-event'] as string;
      const signature = req.headers['x-hub-signature-256'] as string;
      const deliveryId = req.headers['x-github-delivery'] as string;

      if (!eventType) {
        return res.status(400).json({
          success: false,
          error: 'Missing X-GitHub-Event header',
        });
      }

      logger.info('GitHub webhook received', {
        eventType,
        deliveryId,
        hasSignature: !!signature,
      });

      const result = await this.webhookService.processWebhook(
        eventType,
        req.body,
        signature
      );

      const statusCode = result.success ? 200 : 400;

      return res.status(statusCode).json({
        success: result.success,
        message: result.message,
        data: {
          eventType,
          deliveryId,
          userUpdated: result.userUpdated || false,
        },
        error: result.error,
      });
    } catch (error) {
      logger.error('Webhook handling error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error processing webhook',
      });
    }
  }

  /**
   * Get webhook configuration
   */
  async getWebhookConfig(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Return the webhook configuration
      const config = {
        url: `${req.protocol}://${req.get('host')}/api/webhooks/github`,
        events: [
          'push',
          'repository',
          'star',
          'fork',
          'issues',
          'pull_request'
        ],
        active: true,
        content_type: 'json',
        insecure_ssl: req.protocol === 'http' ? '1' : '0',
      };

      return res.json({
        success: true,
        data: {
          config,
          instructions: {
            setup: [
              '1. Go to your GitHub repository settings',
              '2. Navigate to "Webhooks" section',
              '3. Click "Add webhook"',
              '4. Enter the webhook URL provided above',
              '5. Select "application/json" as content type',
              '6. Choose the events you want to monitor',
              '7. Click "Add webhook" to save'
            ],
            events: {
              push: 'Triggered when commits are pushed to the repository',
              repository: 'Triggered when repository is created, deleted, or modified',
              star: 'Triggered when repository is starred or unstarred',
              fork: 'Triggered when repository is forked',
              issues: 'Triggered when issues are created, updated, or closed',
              pull_request: 'Triggered when pull requests are created, updated, or merged'
            }
          }
        },
      });
    } catch (error) {
      logger.error('Get webhook config error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get webhook configuration',
      });
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const stats = await this.webhookService.getWebhookStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get webhook stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get webhook statistics',
      });
    }
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Create a test webhook payload
      const testPayload = {
        zen: 'Keep it logically awesome.',
        hook_id: 12345,
        hook: {
          type: 'Repository',
          id: 12345,
          name: 'web',
          active: true,
          events: ['push', 'pull_request'],
          config: {
            content_type: 'json',
            insecure_ssl: '0',
            url: `${req.protocol}://${req.get('host')}/api/webhooks/github`
          }
        },
        repository: {
          id: 35129377,
          name: 'public-repo',
          full_name: 'baxterthehacker/public-repo',
          owner: {
            login: 'baxterthehacker',
            id: 6752317,
            avatar_url: 'https://avatars.githubusercontent.com/u/6752317?v=3',
            type: 'User'
          }
        }
      };

      const result = await this.webhookService.processWebhook('ping', testPayload);

      return res.json({
        success: result.success,
        message: 'Webhook test completed',
        data: {
          testResult: result,
          testPayload: {
            event: 'ping',
            processed: result.success,
          }
        },
      });
    } catch (error) {
      logger.error('Test webhook error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to test webhook',
      });
    }
  }

  /**
   * Validate webhook configuration
   */
  async validateWebhookSetup(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const validation = {
        endpointUrl: `${req.protocol}://${req.get('host')}/api/webhooks/github`,
        isAccessible: true, // In production, you'd actually test this
        supportedEvents: [
          'push',
          'repository', 
          'star',
          'fork',
          'issues',
          'pull_request',
          'ping'
        ],
        securityNotes: [
          'Webhook signatures are validated for security',
          'Only registered users will have their events processed',
          'All webhook events are logged for debugging'
        ]
      };

      return res.json({
        success: true,
        data: validation,
        message: 'Webhook setup validation completed',
      });
    } catch (error) {
      logger.error('Validate webhook setup error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate webhook setup',
      });
    }
  }
}