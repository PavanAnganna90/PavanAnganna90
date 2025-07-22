import { Pool } from 'pg';
import Redis from 'ioredis';

// PostgreSQL connection
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'opssight',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }

  return pool;
}

// Redis connection
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redis;
}

// Database health check
export async function checkDbHealth() {
  try {
    const pool = getDbPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'healthy', service: 'postgresql' };
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
    return { status: 'unhealthy', service: 'postgresql', error: error.message };
  }
}

// Redis health check
export async function checkRedisHealth() {
  try {
    const redis = getRedisClient();
    await redis.ping();
    return { status: 'healthy', service: 'redis' };
  } catch (error) {
    console.error('Redis health check failed:', error);
    return { status: 'unhealthy', service: 'redis', error: error.message };
  }
}

// Graceful shutdown
export async function closeConnections() {
  try {
    if (pool) {
      await pool.end();
      pool = null;
    }
    if (redis) {
      await redis.quit();
      redis = null;
    }
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}