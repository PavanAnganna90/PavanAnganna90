import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  const responseTime = Date.now() - startTime;

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    responseTime: `${responseTime}ms`,
    service: 'frontend',
    metrics: {
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }
  };

  return NextResponse.json(health, { status: 200 });
}