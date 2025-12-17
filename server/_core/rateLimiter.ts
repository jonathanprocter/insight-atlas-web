/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse with configurable limits.
 * Uses Redis when available, falls back to in-memory store.
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { cache } from './redis';

// Extend Express Request type to include rateLimit info
interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

interface RequestWithRateLimit extends Request {
  rateLimit?: RateLimitInfo;
}

/**
 * Custom Redis store for express-rate-limit
 * Falls back to memory store if Redis unavailable
 */
class RedisStore {
  prefix: string;
  windowMs: number;

  constructor(prefix = 'rl:', windowMs = 60000) {
    this.prefix = prefix;
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const fullKey = `${this.prefix}${key}`;
    const hits = await cache.incr(fullKey);

    // Set expiry on first hit
    if (hits === 1) {
      await cache.expire(fullKey, Math.ceil(this.windowMs / 1000));
    }

    const resetTime = new Date(Date.now() + this.windowMs);
    return { totalHits: hits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    // Not strictly necessary for our use case
    const fullKey = `${this.prefix}${key}`;
    const current = await cache.get(fullKey);
    if (current) {
      const value = Math.max(0, parseInt(current, 10) - 1);
      await cache.set(fullKey, String(value));
    }
  }

  async resetKey(key: string): Promise<void> {
    await cache.del(`${this.prefix}${key}`);
  }
}

/**
 * Generate key from request
 */
function keyGenerator(req: Request): string {
  // Use user ID if authenticated, otherwise IP
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from various headers (for proxied requests)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.ip || req.socket.remoteAddress || 'unknown';

  return `ip:${ip}`;
}

/**
 * Standard rate limiter for general API endpoints
 * 100 requests per minute per user/IP
 */
export const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const rateLimitReq = req as RequestWithRateLimit;
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please wait before making more requests',
      retryAfter: Math.ceil((rateLimitReq.rateLimit?.resetTime?.getTime() ?? Date.now() + 60000 - Date.now()) / 1000),
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Strict rate limiter for resource-intensive endpoints
 * (e.g., insight generation, file uploads)
 * 10 requests per minute per user/IP
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const rateLimitReq = req as RequestWithRateLimit;
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'This endpoint has stricter limits. Please wait before trying again.',
      retryAfter: Math.ceil((rateLimitReq.rateLimit?.resetTime?.getTime() ?? Date.now() + 60000 - Date.now()) / 1000),
    });
  },
});

/**
 * Very strict limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Always use IP for auth endpoints
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket.remoteAddress || 'unknown';
    return `auth:${ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please wait 15 minutes before trying again.',
      retryAfter: 900, // 15 minutes
    });
  },
});

/**
 * Upload limiter - for file uploads
 * 20 uploads per hour per user/IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const rateLimitReq = req as RequestWithRateLimit;
    res.status(429).json({
      error: 'Upload limit reached',
      message: 'You can upload up to 20 files per hour. Please wait before uploading more.',
      retryAfter: Math.ceil((rateLimitReq.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000),
    });
  },
});

/**
 * Export limiter - for document exports
 * 30 exports per hour per user/IP
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const rateLimitReq = req as RequestWithRateLimit;
    res.status(429).json({
      error: 'Export limit reached',
      message: 'You can export up to 30 documents per hour. Please wait before exporting more.',
      retryAfter: Math.ceil((rateLimitReq.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000),
    });
  },
});

/**
 * Insight generation limiter - very resource intensive
 * 5 generations per hour per user/IP
 */
export const insightGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const rateLimitReq = req as RequestWithRateLimit;
    res.status(429).json({
      error: 'Generation limit reached',
      message: 'Insight generation is resource-intensive. You can generate up to 5 insights per hour.',
      retryAfter: Math.ceil((rateLimitReq.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000),
    });
  },
});

/**
 * Audio generation limiter
 * 10 audio generations per hour per user/IP
 */
export const audioGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const rateLimitReq = req as RequestWithRateLimit;
    res.status(429).json({
      error: 'Audio generation limit reached',
      message: 'You can generate up to 10 audio narrations per hour.',
      retryAfter: Math.ceil((rateLimitReq.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000),
    });
  },
});

/**
 * Create a custom rate limiter with specific settings
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      const rateLimitReq = req as RequestWithRateLimit;
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimitReq.rateLimit?.resetTime?.getTime() ?? Date.now() + options.windowMs - Date.now()) / 1000),
      });
    },
  });
}

/**
 * Middleware to add rate limit info to response headers
 */
export function rateLimitInfo(req: Request, res: Response, next: NextFunction): void {
  const rateLimitReq = req as RequestWithRateLimit;
  res.on('finish', () => {
    if (rateLimitReq.rateLimit) {
      // Headers are already set by express-rate-limit
      console.log(`[RateLimit] ${req.method} ${req.path} - ${rateLimitReq.rateLimit.current}/${rateLimitReq.rateLimit.limit} requests`);
    }
  });
  next();
}
