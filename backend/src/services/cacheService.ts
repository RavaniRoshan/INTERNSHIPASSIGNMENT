import Redis from 'ioredis';

class CacheService {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour in seconds

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache pattern invalidation error:', error);
      return false;
    }
  }

  // Session-specific methods
  async setSession(sessionId: string, data: any, ttl: number = 86400): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  }

  // Project-specific caching
  async cacheProject(projectId: string, project: any, ttl: number = 1800): Promise<boolean> {
    return this.set(`project:${projectId}`, project, ttl);
  }

  async getCachedProject<T>(projectId: string): Promise<T | null> {
    return this.get<T>(`project:${projectId}`);
  }

  async invalidateProjectCache(projectId: string): Promise<boolean> {
    return this.del(`project:${projectId}`);
  }

  // Search results caching
  async cacheSearchResults(query: string, results: any, ttl: number = 600): Promise<boolean> {
    const cacheKey = `search:${Buffer.from(query).toString('base64')}`;
    return this.set(cacheKey, results, ttl);
  }

  async getCachedSearchResults<T>(query: string): Promise<T | null> {
    const cacheKey = `search:${Buffer.from(query).toString('base64')}`;
    return this.get<T>(cacheKey);
  }

  // Analytics caching
  async cacheAnalytics(key: string, data: any, ttl: number = 300): Promise<boolean> {
    return this.set(`analytics:${key}`, data, ttl);
  }

  async getCachedAnalytics<T>(key: string): Promise<T | null> {
    return this.get<T>(`analytics:${key}`);
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

export const cacheService = new CacheService();
export default cacheService;