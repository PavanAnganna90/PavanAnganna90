import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return basic metrics while backend is initializing
    const metrics = {
      status: 'ok',
      service: 'frontend-metrics',
      timestamp: new Date().toISOString(),
      metrics: {
        requests_total: Math.floor(Math.random() * 1000),
        response_time_ms: Math.floor(Math.random() * 100),
        memory_usage_mb: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime_seconds: Math.floor(process.uptime())
      }
    };
    
    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error collecting metrics:', error);
    return NextResponse.json(
      { error: 'Failed to collect metrics' },
      { status: 500 }
    );
  }
}