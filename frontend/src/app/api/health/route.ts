import { NextResponse } from 'next/server';
import { checkDbHealth, checkRedisHealth } from '../../../lib/db';
import { sessionManager } from '../../../lib/session';

export async function GET() {
  const startTime = Date.now();
  
  // Check database health
  const dbHealth = await checkDbHealth();
  const redisHealth = await checkRedisHealth();
  
  // Get active session count
  let sessionCount = 0;
  try {
    sessionCount = await sessionManager.getActiveSessionCount();
  } catch (error) {
    console.warn('Could not get session count:', error);
  }

  const responseTime = Date.now() - startTime;
  const overall = dbHealth.status === 'healthy' && redisHealth.status === 'healthy' ? 'healthy' : 'degraded';

  const health = {
    status: overall,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    responseTime: `${responseTime}ms`,
    services: {
      database: dbHealth,
      redis: redisHealth
    },
    metrics: {
      activeSessions: sessionCount,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }
  };

  const statusCode = overall === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}