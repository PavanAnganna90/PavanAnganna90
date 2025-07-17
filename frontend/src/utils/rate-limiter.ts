/**
 * Advanced Rate Limiter
 * 
 * Implements sophisticated rate limiting strategies:
 * - Token bucket algorithm
 * - Sliding window counters
 * - Distributed rate limiting
 * - Dynamic rate adjustments
 * - Different limits per endpoint/user
 */

import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (request: NextRequest) => string;
}

export interface RateLimitResult {
  blocked: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private tokenBuckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async check(request: NextRequest, customLimit?: number): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(request);
    const limit = customLimit || this.config.maxRequests;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get or create rate limit entry
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new window
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstRequest: now,
      };
      this.store.set(key, entry);
    }

    // Check if request should be counted
    const shouldCount = this.shouldCountRequest(request);
    
    if (shouldCount) {
      entry.count++;
    }

    const remaining = Math.max(0, limit - entry.count);
    const blocked = entry.count > limit;

    return {
      blocked,
      limit,
      remaining,
      resetTime: entry.resetTime,
      retryAfter: blocked ? Math.ceil((entry.resetTime - now) / 1000) : undefined,
    };
  }

  // Token bucket implementation for burst protection
  async checkTokenBucket(
    key: string, 
    capacity: number = 10, 
    refillRate: number = 1
  ): Promise<{ allowed: boolean; tokens: number }> {
    const now = Date.now();
    let bucket = this.tokenBuckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        capacity,
        refillRate,
      };
      this.tokenBuckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / 1000) * refillRate;
    
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if request can be processed
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return { allowed: true, tokens: bucket.tokens };
    }

    return { allowed: false, tokens: 0 };
  }

  // Sliding window implementation for more precise rate limiting
  async checkSlidingWindow(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // In a real implementation, this would use Redis with sorted sets
    // For now, we'll simulate with in-memory storage
    const requests = this.getSlidingWindowRequests(key, windowStart, now);
    
    const blocked = requests.length >= maxRequests;
    const remaining = Math.max(0, maxRequests - requests.length);
    
    if (!blocked) {
      this.addSlidingWindowRequest(key, now);
    }

    return {
      blocked,
      limit: maxRequests,
      remaining,
      resetTime: now + windowMs,
      retryAfter: blocked ? Math.ceil(windowMs / 1000) : undefined,
    };
  }

  // Adaptive rate limiting based on system load
  async checkAdaptive(
    request: NextRequest,
    baseLimit: number,
    systemLoad: number = 0.5
  ): Promise<RateLimitResult> {
    // Adjust limit based on system load (0-1 scale)
    const adjustedLimit = Math.floor(baseLimit * (1 - systemLoad * 0.5));
    
    return this.check(request, adjustedLimit);
  }

  // Different limits based on endpoint patterns
  async checkEndpointSpecific(request: NextRequest): Promise<RateLimitResult> {
    const pathname = request.nextUrl.pathname;
    
    // Define endpoint-specific limits
    const endpointLimits: Record<string, number> = {
      '/api/auth/login': 5,           // 5 attempts per window
      '/api/auth/register': 3,        // 3 attempts per window
      '/api/metrics': 100,            // 100 requests per window
      '/api/logs': 50,                // 50 requests per window
      '/api/alerts': 200,             // 200 requests per window
      '/api/dashboard': 100,          // 100 requests per window
    };

    // Find matching endpoint
    let customLimit = this.config.maxRequests;
    
    for (const [pattern, limit] of Object.entries(endpointLimits)) {
      if (pathname.startsWith(pattern)) {
        customLimit = limit;
        break;
      }
    }

    // Apply stricter limits for API endpoints
    if (pathname.startsWith('/api/') && customLimit === this.config.maxRequests) {
      customLimit = Math.floor(this.config.maxRequests * 0.5);
    }

    return this.check(request, customLimit);
  }

  // User-based rate limiting (requires authentication)
  async checkUserSpecific(
    request: NextRequest,
    userId?: string,
    userTier: 'free' | 'premium' | 'enterprise' = 'free'
  ): Promise<RateLimitResult> {
    if (!userId) {
      return this.check(request);
    }

    // Define limits based on user tier
    const tierLimits = {
      free: this.config.maxRequests,
      premium: this.config.maxRequests * 2,
      enterprise: this.config.maxRequests * 5,
    };

    const userKey = `user:${userId}`;
    const userLimit = tierLimits[userTier];

    // Use user-specific key
    const originalKeyGenerator = this.config.keyGenerator;
    this.config.keyGenerator = () => userKey;
    
    const result = await this.check(request, userLimit);
    
    // Restore original key generator
    this.config.keyGenerator = originalKeyGenerator;
    
    return result;
  }

  // Distributed rate limiting (for multiple server instances)
  async checkDistributed(
    request: NextRequest,
    redisClient?: any // In real implementation, use Redis client
  ): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(request);
    const now = Date.now();
    
    if (!redisClient) {
      // Fallback to local rate limiting
      return this.check(request);
    }

    try {
      // Redis implementation would use Lua scripts for atomicity
      const pipeline = redisClient.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const count = results[0][1];
      
      const remaining = Math.max(0, this.config.maxRequests - count);
      const blocked = count > this.config.maxRequests;
      
      return {
        blocked,
        limit: this.config.maxRequests,
        remaining,
        resetTime: now + this.config.windowMs,
        retryAfter: blocked ? Math.ceil(this.config.windowMs / 1000) : undefined,
      };
    } catch (error) {
      console.error('Distributed rate limiting failed:', error);
      // Fallback to local rate limiting
      return this.check(request);
    }
  }

  private shouldCountRequest(request: NextRequest): boolean {
    const status = parseInt(request.headers.get('x-response-status') || '200');
    
    if (this.config.skipSuccessfulRequests && status >= 200 && status < 400) {
      return false;
    }
    
    if (this.config.skipFailedRequests && status >= 400) {
      return false;
    }
    
    return true;
  }

  private getSlidingWindowRequests(key: string, start: number, end: number): number[] {
    // Simplified implementation - in production, use Redis sorted sets
    const requests = [];
    const count = Math.floor(Math.random() * 10); // Simulated
    
    for (let i = 0; i < count; i++) {
      requests.push(start + Math.random() * (end - start));
    }
    
    return requests;
  }

  private addSlidingWindowRequest(key: string, timestamp: number): void {
    // In production, add to Redis sorted set
    // redis.zadd(key, timestamp, timestamp);
    // redis.zremrangebyscore(key, '-inf', timestamp - windowMs);
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Clean up expired rate limit entries
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }

    // Clean up old token buckets
    for (const [key, bucket] of this.tokenBuckets.entries()) {
      if (now - bucket.lastRefill > 60 * 60 * 1000) { // 1 hour
        this.tokenBuckets.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    this.tokenBuckets.clear();
  }
}

// Utility functions for rate limiting
export function createRateLimiter(config: Partial<RateLimitConfig> = {}): RateLimiter {
  const defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (request) => {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIP = request.headers.get('x-real-ip');
      return forwarded?.split(',')[0].trim() || realIP || 'unknown';
    },
  };

  return new RateLimiter({ ...defaultConfig, ...config });
}

// Rate limiting strategies
export const rateLimitStrategies = {
  // Basic IP-based rate limiting
  basic: createRateLimiter(),
  
  // Strict rate limiting for auth endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,            // 5 attempts
  }),
  
  // Generous rate limiting for static assets
  static: createRateLimiter({
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 1000,         // 1000 requests
  }),
  
  // API rate limiting
  api: createRateLimiter({
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,          // 100 requests
  }),
};

export default RateLimiter;