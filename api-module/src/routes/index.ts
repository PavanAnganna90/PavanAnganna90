import { Router } from 'express';
import userRoutes from './user.routes';
import postRoutes from './post.routes';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import githubRoutes from './github.routes';
import webhookRoutes from './webhook.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/github', githubRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;