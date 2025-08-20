import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/cacheService';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
}

export const cache = (options: CacheOptions = {}) => {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req: Request) => `${req.method}:${req.originalUrl}`,
    condition = () => true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests by default
    if (req.method !== 'GET' || !condition(req, res)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache the response
      res.json = function(body: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttl).catch(error => {
            console.error('Failed to cache response:', error);
          });
        }
        
        // Call original json method
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Specific cache middleware for different endpoints
export const cacheProjects = cache({
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => `projects:${req.originalUrl}`,
  condition: (req) => !req.headers.authorization // Don't cache authenticated requests
});

export const cacheSearch = cache({
  ttl: 600, // 10 minutes
  keyGenerator: (req) => `search:${req.originalUrl}`,
});

export const cacheAnalytics = cache({
  ttl: 300, // 5 minutes
  keyGenerator: (req) => `analytics:${req.originalUrl}:${req.user?.id || 'anonymous'}`,
  condition: (req) => !!req.user // Only cache for authenticated users
});

export const cacheRecommendations = cache({
  ttl: 900, // 15 minutes
  keyGenerator: (req) => `recommendations:${req.originalUrl}:${req.user?.id || 'anonymous'}`,
});

// Cache invalidation helper
export const invalidateCache = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    const invalidateCachePatterns = async () => {
      for (const pattern of patterns) {
        try {
          await cacheService.invalidatePattern(pattern);
        } catch (error) {
          console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
        }
      }
    };

    // Override response methods to invalidate cache on successful operations
    res.json = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCachePatterns();
      }
      return originalJson.call(this, body);
    };

    res.send = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCachePatterns();
      }
      return originalSend.call(this, body);
    };

    next();
  };
};