import { Request, Response, NextFunction } from 'express';
import { getRedisClient, CacheKeys, CacheTTL } from '@/config/redis';
import logger from '@/utils/logger';
import crypto from 'crypto';

export interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  condition?: (req: Request) => boolean;
  invalidatePattern?: string[];
}

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request, keyPrefix: string = CacheKeys.API_RESPONSE): string => {
  const { method, originalUrl, query, params } = req;
  const keyData = {
    method,
    url: originalUrl,
    query,
    params,
  };
  
  const hash = crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  return `${keyPrefix}${hash}`;
};

/**
 * Cache middleware for GET requests
 */
export const cache = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    // Check if caching should be applied based on condition
    if (options.condition && !options.condition(req)) {
      return next();
    }

    const redis = getRedisClient();
    const cacheKey = generateCacheKey(req, options.keyPrefix);

    try {
      // Try to get cached response
      const cachedData = await redis.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        const parsedData = JSON.parse(cachedData);
        
        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        
        return res.json(parsedData);
      }

      logger.debug(`Cache miss for key: ${cacheKey}`);
      
      // Store original res.json method
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ttl = options.ttl || CacheTTL.MEDIUM;
          
          redis.setex(cacheKey, ttl, JSON.stringify(data))
            .catch(err => logger.error('Failed to cache response:', err));
          
          // Add cache headers
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Key', cacheKey);
          res.setHeader('X-Cache-TTL', ttl.toString());
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Continue without cache on error
      next();
    }
  };
};

/**
 * Invalidate cache entries matching patterns
 */
export const invalidateCache = async (patterns: string[]): Promise<void> => {
  const redis = getRedisClient();
  
  try {
    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    }
  } catch (error) {
    logger.error('Failed to invalidate cache:', error);
  }
};

/**
 * Clear all cache entries
 */
export const clearCache = async (): Promise<void> => {
  const redis = getRedisClient();
  
  try {
    await redis.flushdb();
    logger.info('Cleared all cache entries');
  } catch (error) {
    logger.error('Failed to clear cache:', error);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<any> => {
  const redis = getRedisClient();
  
  try {
    const info = await redis.info('stats');
    const dbSize = await redis.dbsize();
    
    return {
      dbSize,
      info,
    };
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    return null;
  }
};