import { Router } from 'express';
import { WebhookController } from '@/controllers/webhook.controller';
import { authenticateToken } from '@/middleware/auth';
import { generalLimiter, strictLimiter } from '@/middleware/rateLimiter';

const router = Router();
const webhookController = new WebhookController();

/**
 * @swagger
 * /api/webhooks/github:
 *   post:
 *     summary: Handle incoming GitHub webhook events
 *     tags: [Webhooks]
 *     description: |
 *       Receives and processes GitHub webhook events such as pushes, stars, forks, etc.
 *       This endpoint is called directly by GitHub when configured as a webhook URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: GitHub webhook payload (varies by event type)
 *     parameters:
 *       - in: header
 *         name: X-GitHub-Event
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of GitHub event
 *       - in: header
 *         name: X-Hub-Signature-256
 *         required: false
 *         schema:
 *           type: string
 *         description: HMAC signature for payload verification
 *       - in: header
 *         name: X-GitHub-Delivery
 *         required: false
 *         schema:
 *           type: string
 *         description: Unique delivery ID for the webhook
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventType:
 *                       type: string
 *                     deliveryId:
 *                       type: string
 *                     userUpdated:
 *                       type: boolean
 *       400:
 *         description: Invalid webhook payload or missing headers
 *       500:
 *         description: Server error processing webhook
 */
router.post('/github', strictLimiter, webhookController.handleGitHubWebhook.bind(webhookController));

/**
 * @swagger
 * /api/webhooks/config:
 *   get:
 *     summary: Get webhook configuration instructions
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     description: Returns webhook URL and setup instructions for GitHub repository configuration
 *     responses:
 *       200:
 *         description: Webhook configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     config:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           description: Webhook URL to configure in GitHub
 *                         events:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: Supported webhook events
 *                         active:
 *                           type: boolean
 *                         content_type:
 *                           type: string
 *                         insecure_ssl:
 *                           type: string
 *                     instructions:
 *                       type: object
 *                       properties:
 *                         setup:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: Step-by-step setup instructions
 *                         events:
 *                           type: object
 *                           description: Description of each supported event type
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/config', authenticateToken, generalLimiter, webhookController.getWebhookConfig.bind(webhookController));

/**
 * @swagger
 * /api/webhooks/stats:
 *   get:
 *     summary: Get webhook processing statistics
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     description: Returns statistics about processed webhook events
 *     responses:
 *       200:
 *         description: Webhook statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEvents:
 *                       type: number
 *                       description: Total number of processed events
 *                     eventTypes:
 *                       type: object
 *                       description: Count of events by type
 *                     lastProcessed:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of last processed event
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/stats', authenticateToken, generalLimiter, webhookController.getWebhookStats.bind(webhookController));

/**
 * @swagger
 * /api/webhooks/test:
 *   post:
 *     summary: Test webhook processing
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     description: Send a test webhook event to verify the processing pipeline
 *     responses:
 *       200:
 *         description: Webhook test completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     testResult:
 *                       type: object
 *                       description: Result of processing the test webhook
 *                     testPayload:
 *                       type: object
 *                       description: The test payload that was processed
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/test', authenticateToken, generalLimiter, webhookController.testWebhook.bind(webhookController));

/**
 * @swagger
 * /api/webhooks/validate:
 *   get:
 *     summary: Validate webhook setup
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     description: Validate that the webhook endpoint is properly configured and accessible
 *     responses:
 *       200:
 *         description: Webhook validation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     endpointUrl:
 *                       type: string
 *                       description: The webhook endpoint URL
 *                     isAccessible:
 *                       type: boolean
 *                       description: Whether the endpoint is accessible
 *                     supportedEvents:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of supported webhook events
 *                     securityNotes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Security implementation notes
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/validate', authenticateToken, generalLimiter, webhookController.validateWebhookSetup.bind(webhookController));

export default router;