import rateLimit from 'express-rate-limit';
import config from '@/config/environment';
import { ApiResponse } from '@/types/api';

export const createRateLimiter = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.RATE_LIMIT_WINDOW_MS,
    max: max || config.RATE_LIMIT_MAX_REQUESTS,
    message: {
      success: false,
      error: 'Too many requests, please try again later',
    } as ApiResponse,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const generalLimiter = createRateLimiter();

export const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes

export const strictLimiter = createRateLimiter(60 * 1000, 10); // 10 requests per minute