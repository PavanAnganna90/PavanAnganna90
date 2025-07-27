import { Router, Request, Response } from 'express';
import DatabaseService from '@/config/database';
import { ApiResponse } from '@/types/api';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const dbService = DatabaseService.getInstance();
    const isDbHealthy = await dbService.healthCheck();

    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      database: {
        status: isDbHealthy ? 'connected' : 'disconnected',
      },
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
    };

    const response: ApiResponse = {
      success: true,
      data: health,
    };

    const statusCode = isDbHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
    };
    res.status(503).json(response);
  }
});

export default router;