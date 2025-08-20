import { searchService } from './searchService';
import { integrationService } from './integrationService';
import logger from '../utils/logger';

/**
 * System initialization service that ensures all components are properly set up
 */
export class SystemInitService {
  /**
   * Initialize all system components
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Starting system initialization');

      // Initialize search service
      await this.initializeSearchService();

      // Perform health check
      await this.performHealthCheck();

      logger.info('System initialization completed successfully');
    } catch (error) {
      logger.error('System initialization failed', { error });
      throw error;
    }
  }

  /**
   * Initialize search service with proper configuration
   */
  private async initializeSearchService(): Promise<void> {
    try {
      logger.info('Initializing search service');
      await searchService.initialize();
      logger.info('Search service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize search service', { error });
      throw error;
    }
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      logger.info('Performing system health check');
      const healthStatus = await integrationService.healthCheck();
      
      if (healthStatus.status === 'unhealthy') {
        logger.error('System health check failed', { healthStatus });
        throw new Error('System is unhealthy');
      }

      if (healthStatus.status === 'degraded') {
        logger.warn('System is running in degraded mode', { healthStatus });
      } else {
        logger.info('System health check passed', { healthStatus });
      }
    } catch (error) {
      logger.error('Health check failed', { error });
      throw error;
    }
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Starting graceful system shutdown');

      // Close database connections
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$disconnect();

      logger.info('System shutdown completed');
    } catch (error) {
      logger.error('Error during system shutdown', { error });
      throw error;
    }
  }
}

export const systemInitService = new SystemInitService();