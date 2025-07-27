import { Router } from 'express';
import { GitHubController } from '@/controllers/github.controller';
import { authenticateToken } from '@/middleware/auth';
import { generalLimiter } from '@/middleware/rateLimiter';

const router = Router();
const githubController = new GitHubController();

// Apply authentication and rate limiting to all GitHub routes
router.use(authenticateToken);
router.use(generalLimiter);

/**
 * @swagger
 * /api/github/profile:
 *   get:
 *     summary: Get user's GitHub profile with repositories and stats
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GitHub profile data retrieved successfully
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
 *                       $ref: '#/components/schemas/User'
 *                     githubProfile:
 *                       $ref: '#/components/schemas/GitHubUser'
 *                     repositories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GitHubRepo'
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalRepos:
 *                           type: number
 *                         totalStars:
 *                           type: number
 *                         totalForks:
 *                           type: number
 *                         languages:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: User not connected to GitHub
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/profile', githubController.getProfile.bind(githubController));

/**
 * @swagger
 * /api/github/sync:
 *   post:
 *     summary: Sync user data with latest GitHub information
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync completed successfully
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
 *                     success:
 *                       type: boolean
 *                     updated:
 *                       type: boolean
 *                     changes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     error:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/sync', githubController.syncProfile.bind(githubController));

/**
 * @swagger
 * /api/github/repositories:
 *   get:
 *     summary: Get user's GitHub repositories
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, owner, member]
 *           default: owner
 *         description: Repository type filter
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, pushed, full_name]
 *           default: updated
 *         description: Sort repositories by
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 30
 *         description: Number of repositories per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Repositories retrieved successfully
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
 *                     repositories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GitHubRepo'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: User not connected to GitHub
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/repositories', githubController.getRepositories.bind(githubController));

/**
 * @swagger
 * /api/github/repositories/{repoName}:
 *   get:
 *     summary: Get specific repository details
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: repoName
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository name
 *     responses:
 *       200:
 *         description: Repository details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GitHubRepo'
 *       400:
 *         description: User not connected to GitHub or invalid repository name
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Repository not found
 *       500:
 *         description: Server error
 */
router.get('/repositories/:repoName', githubController.getRepository.bind(githubController));

/**
 * @swagger
 * /api/github/repositories:
 *   post:
 *     summary: Create a new GitHub repository
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Repository name
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Repository description
 *               private:
 *                 type: boolean
 *                 default: false
 *                 description: Whether the repository should be private
 *               auto_init:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to initialize with README
 *               gitignore_template:
 *                 type: string
 *                 description: Language template for .gitignore
 *               license_template:
 *                 type: string
 *                 description: License template
 *     responses:
 *       201:
 *         description: Repository created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/GitHubRepo'
 *       400:
 *         description: Invalid request data or user not connected to GitHub
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/repositories', githubController.createRepository.bind(githubController));

/**
 * @swagger
 * /api/github/search/repositories:
 *   get:
 *     summary: Search GitHub repositories
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [stars, forks, updated]
 *           default: stars
 *         description: Sort results by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                     total_count:
 *                       type: number
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GitHubRepo'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Invalid search parameters or user not connected to GitHub
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/search/repositories', githubController.searchRepositories.bind(githubController));

/**
 * @swagger
 * /api/github/activity:
 *   get:
 *     summary: Get user's GitHub activity summary
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity summary retrieved successfully
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
 *                     repositoriesCount:
 *                       type: number
 *                     recentRepositories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GitHubRepo'
 *                     languages:
 *                       type: array
 *                       items:
 *                         type: string
 *                     totalStars:
 *                       type: number
 *                     totalForks:
 *                       type: number
 *       400:
 *         description: User not connected to GitHub
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/activity', githubController.getActivity.bind(githubController));

/**
 * @swagger
 * /api/github/disconnect:
 *   delete:
 *     summary: Disconnect GitHub account
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GitHub account disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/disconnect', githubController.disconnectGitHub.bind(githubController));

/**
 * @swagger
 * /api/github/validate:
 *   get:
 *     summary: Validate GitHub connection status
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status retrieved successfully
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
 *                     isValid:
 *                       type: boolean
 *                     error:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/validate', githubController.validateConnection.bind(githubController));

export default router;