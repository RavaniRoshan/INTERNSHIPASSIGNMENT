import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { integrationService } from '../services/integrationService';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: HealthCheck[];
  overall: {
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

// Basic health check - lightweight endpoint for load balancers
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}));

// Detailed health check with service dependencies
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const services: HealthCheck[] = [];

  // Check database connection
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    services.push({
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - dbStart,
    });
  } catch (error) {
    services.push({
      service: 'database',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Only check other services in production or when explicitly configured
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check Redis connection (if configured)
  if (process.env.REDIS_URL && isProduction) {
    try {
      const redisStart = Date.now();
      // Add Redis health check here when Redis is implemented
      services.push({
        service: 'redis',
        status: 'healthy',
        responseTime: Date.now() - redisStart,
      });
    } catch (error) {
      services.push({
        service: 'redis',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Check search service (Meilisearch)
  if (process.env.MEILISEARCH_URL && isProduction) {
    try {
      const searchStart = Date.now();
      // Add Meilisearch health check here when implemented
      services.push({
        service: 'search',
        status: 'healthy',
        responseTime: Date.now() - searchStart,
      });
    } catch (error) {
      services.push({
        service: 'search',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Check file storage (AWS S3)
  if (process.env.AWS_S3_BUCKET && isProduction) {
    try {
      const storageStart = Date.now();
      // Add S3 health check here when implemented
      services.push({
        service: 'storage',
        status: 'healthy',
        responseTime: Date.now() - storageStart,
      });
    } catch (error) {
      services.push({
        service: 'storage',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Check integrated services health
  try {
    const integrationStart = Date.now();
    const integrationHealth = await integrationService.healthCheck();
    
    services.push({
      service: 'integration',
      status: integrationHealth.status === 'healthy' ? 'healthy' : 
              integrationHealth.status === 'degraded' ? 'degraded' : 'unhealthy',
      responseTime: Date.now() - integrationStart,
      details: integrationHealth.services,
    });
  } catch (error) {
    services.push({
      service: 'integration',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Calculate overall status
  const healthy = services.filter(s => s.status === 'healthy').length;
  const unhealthy = services.filter(s => s.status === 'unhealthy').length;
  const degraded = services.filter(s => s.status === 'degraded').length;

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  if (unhealthy > 0) {
    overallStatus = unhealthy === services.length ? 'unhealthy' : 'degraded';
  } else if (degraded > 0) {
    overallStatus = 'degraded';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services,
    overall: {
      healthy,
      unhealthy,
      degraded,
    },
  };

  // Log health check results
  logger.info('Health check completed', {
    status: overallStatus,
    responseTime: Date.now() - startTime,
    services: services.length,
    healthy,
    unhealthy,
    degraded,
  });

  // Return appropriate HTTP status
  // Only return 503 if ALL services are unhealthy, otherwise return 200 with status info
  const statusCode = overallStatus === 'unhealthy' && unhealthy === services.length ? 503 : 200;

  res.status(statusCode).json(response);
}));

// Readiness check - indicates if the service is ready to accept traffic
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    // Check critical dependencies
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to accept traffic',
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error instanceof Error ? error.message : error });
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      message: 'Service is not ready to accept traffic',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

// Liveness check - indicates if the service is alive
router.get('/live', asyncHandler(async (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
  });
}));

// Metrics endpoint for monitoring
router.get('/metrics', asyncHandler(async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  });
}));

export default router;