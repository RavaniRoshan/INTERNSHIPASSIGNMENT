import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/cacheService';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || 'Too many requests, please try again later.',
      keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = `rate_limit:${this.options.keyGenerator(req)}`;
        const now = Date.now();
        const windowStart = now - this.options.windowMs;

        // Get current rate limit info
        const rateLimitInfo = await cacheService.get<RateLimitInfo>(key);

        let count = 1;
        let resetTime = now + this.options.windowMs;

        if (rateLimitInfo) {
          if (rateLimitInfo.resetTime > now) {
            // Within the current window
            count = rateLimitInfo.count + 1;
            resetTime = rateLimitInfo.resetTime;
          } else {
            // Window has expired, reset count
            count = 1;
            resetTime = now + this.options.windowMs;
          }
        }

        // Set headers
        res.set({
          'X-RateLimit-Limit': this.options.maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, this.options.maxRequests - count).toString(),
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        });

        if (count > this.options.maxRequests) {
          res.set('Retry-After', Math.ceil((resetTime - now) / 1000).toString());
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: this.options.message,
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Store the updated count
        await cacheService.set(key, { count, resetTime }, Math.ceil(this.options.windowMs / 1000));

        // Override response methods to handle skip options
        const originalJson = res.json;
        const originalSend = res.send;

        res.json = function(body: any) {
          const shouldSkip = 
            (res.statusCode >= 200 && res.statusCode < 400 && rateLimiter.options.skipSuccessfulRequests) ||
            (res.statusCode >= 400 && rateLimiter.options.skipFailedRequests);

          if (shouldSkip) {
            // Decrement the count if we're skipping this request
            cacheService.set(key, { count: count - 1, resetTime }, Math.ceil(rateLimiter.options.windowMs / 1000));
          }

          return originalJson.call(this, body);
        };

        res.send = function(body: any) {
          const shouldSkip = 
            (res.statusCode >= 200 && res.statusCode < 400 && rateLimiter.options.skipSuccessfulRequests) ||
            (res.statusCode >= 400 && rateLimiter.options.skipFailedRequests);

          if (shouldSkip) {
            // Decrement the count if we're skipping this request
            cacheService.set(key, { count: count - 1, resetTime }, Math.ceil(rateLimiter.options.windowMs / 1000));
          }

          return originalSend.call(this, body);
        };

        const rateLimiter = this;
        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // If rate limiting fails, allow the request to proceed
        next();
      }
    };
  }
}

// Predefined rate limiters for different endpoints
export const generalRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
});

export const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req) => `auth:${req.ip}:${req.body.email || 'unknown'}`,
});

export const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 uploads per hour
  message: 'Upload limit exceeded, please try again later.',
  keyGenerator: (req) => `upload:${req.user?.userId || req.ip}`,
});

export const searchRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 searches per minute
  message: 'Search rate limit exceeded, please slow down.',
});

export const apiRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 API calls per 15 minutes for authenticated users
  message: 'API rate limit exceeded, please try again later.',
  keyGenerator: (req) => `api:${req.user?.userId || req.ip}`,
});

// Create middleware functions
export const generalRateLimitMiddleware = generalRateLimit.middleware();
export const authRateLimitMiddleware = authRateLimit.middleware();
export const uploadRateLimitMiddleware = uploadRateLimit.middleware();
export const searchRateLimitMiddleware = searchRateLimit.middleware();
export const apiRateLimitMiddleware = apiRateLimit.middleware();