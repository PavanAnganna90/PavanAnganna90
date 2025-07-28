import Redis from 'ioredis';
import config from './environment';
import logger from '@/utils/logger';

// Redis client instance
let redisClient: Redis | null = null;

// Redis configuration
const redisConfig = {
  host: config.REDIS_HOST || 'localhost',
  port: config.REDIS_PORT || 6379,
  password: config.REDIS_PASSWORD,
  db: config.REDIS_DB || 0,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
};

// Initialize Redis client
export const initializeRedis = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis client error:', error);
  });

  redisClient.on('close', () => {
    logger.warn('Redis client connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });

  return redisClient;
};

// Get Redis client instance
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
};

// Close Redis connection
export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
};

// Cache key prefixes
export const CacheKeys = {
  USER: 'user:',
  POST: 'post:',
  POSTS_LIST: 'posts:list:',
  DASHBOARD_STATS: 'dashboard:stats:',
  ACTIVITY_LOGS: 'activity:logs:',
  API_RESPONSE: 'api:response:',
} as const;

// Cache TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

export default redisClient;