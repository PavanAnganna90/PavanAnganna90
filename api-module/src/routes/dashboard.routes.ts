import { Router } from 'express';
import { DashboardController } from '@/controllers/dashboard.controller';
import { authenticateToken } from '@/middleware/auth';
import { generalLimiter } from '@/middleware/rateLimiter';

const router = Router();
const dashboardController = new DashboardController();

// Apply authentication and rate limiting to all dashboard routes
router.use(authenticateToken);
router.use(generalLimiter);

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get comprehensive dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: Returns platform-wide statistics including user counts, GitHub integration stats, and recent activity
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     totalUsers:
 *                       type: number
 *                       description: Total number of registered users
 *                     connectedGitHubUsers:
 *                       type: number
 *                       description: Number of users with GitHub accounts connected
 *                     totalRepositories:
 *                       type: number
 *                       description: Total number of repositories across all users
 *                     totalStars:
 *                       type: number
 *                       description: Total number of stars across all repositories
 *                     totalForks:
 *                       type: number
 *                       description: Total number of forks across all repositories
 *                     topLanguages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           language:
 *                             type: string
 *                           count:
 *                             type: number
 *                       description: Most popular programming languages
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [user_joined, repo_created, github_connected]
 *                           user:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           details:
 *                             type: string
 *                       description: Recent platform activity
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/stats', dashboardController.getDashboardStats.bind(dashboardController));

/**
 * @swagger
 * /api/dashboard/user:
 *   get:
 *     summary: Get personalized user dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: Returns personalized dashboard data for the authenticated user including GitHub integration data
 *     responses:
 *       200:
 *         description: User dashboard data retrieved successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         githubConnected:
 *                           type: boolean
 *                     github:
 *                       type: object
 *                       description: GitHub integration data (only if connected)
 *                       properties:
 *                         profile:
 *                           type: object
 *                           description: GitHub user profile
 *                         repositories:
 *                           type: array
 *                           items:
 *                             type: object
 *                           description: User's repositories
 *                         stats:
 *                           type: object
 *                           properties:
 *                             totalRepos:
 *                               type: number
 *                             totalStars:
 *                               type: number
 *                             totalForks:
 *                               type: number
 *                             languages:
 *                               type: array
 *                               items:
 *                                 type: string
 *                         activity:
 *                           type: object
 *                           description: GitHub activity summary
 *                     summary:
 *                       type: object
 *                       properties:
 *                         joinedAt:
 *                           type: string
 *                           format: date-time
 *                         lastActive:
 *                           type: string
 *                           format: date-time
 *                         repositoriesCount:
 *                           type: number
 *                         contributionsThisMonth:
 *                           type: number
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/user', dashboardController.getUserDashboard.bind(dashboardController));

/**
 * @swagger
 * /api/dashboard/repositories/insights:
 *   get:
 *     summary: Get GitHub repository insights
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: Returns detailed insights about the user's GitHub repositories including language statistics and top repositories
 *     responses:
 *       200:
 *         description: Repository insights retrieved successfully
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
 *                     totalRepositories:
 *                       type: number
 *                     languages:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Programming languages used
 *                     mostStarred:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: Repositories with most stars
 *                     recentlyUpdated:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: Recently updated repositories
 *                     totalStars:
 *                       type: number
 *                       description: Total stars across all repositories
 *                     totalForks:
 *                       type: number
 *                       description: Total forks across all repositories
 *                     languageStats:
 *                       type: object
 *                       description: Count of repositories by programming language
 *       400:
 *         description: GitHub account not connected
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/repositories/insights', dashboardController.getRepositoryInsights.bind(dashboardController));

/**
 * @swagger
 * /api/dashboard/activity:
 *   get:
 *     summary: Get user activity timeline
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     description: Returns chronological timeline of user activities including account creation, GitHub connection, and repository activities
 *     responses:
 *       200:
 *         description: Activity timeline retrieved successfully
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
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [user_registered, github_connected, repository_created]
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           metadata:
 *                             type: object
 *                             description: Additional activity metadata
 *                     total:
 *                       type: number
 *                       description: Total number of activities
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get('/activity', dashboardController.getActivityTimeline.bind(dashboardController));

export default router;