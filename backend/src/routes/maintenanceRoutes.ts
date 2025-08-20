import { Router, Request, Response } from 'express';
import { integrationService } from '../services/integrationService';
import { analyticsService } from '../services/analyticsService';
import { authenticateToken } from '../middleware/auth';
import { APIResponse } from '../types';
import logger from '../utils/logger';

const router = Router();

// Middleware to check if user is admin (for now, just check if they're authenticated)
// In a real app, you'd check for admin role
const requireAdmin = (req: Request, res: Response, next: any) => {
  // For now, just require authentication
  // In production, you'd check for admin role
  if (!req.user) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
  next();
};

/**
 * Reindex all projects in search engine
 * POST /maintenance/reindex
 */
router.post('/reindex', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    logger.info('Starting project reindexing', { userId: req.user?.userId });
    
    await integrationService.reindexAllProjects();
    
    logger.info('Project reindexing completed successfully');
    
    res.json({
      success: true,
      data: {
        message: 'All projects have been reindexed successfully'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  } catch (error) {
    logger.error('Error during project reindexing', { error });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reindex projects'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
});

/**
 * Recalculate engagement scores for all projects
 * POST /maintenance/recalculate-engagement
 */
router.post('/recalculate-engagement', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    logger.info('Starting engagement score recalculation', { userId: req.user?.userId });
    
    await analyticsService.calculateEngagementRates();
    
    logger.info('Engagement score recalculation completed successfully');
    
    res.json({
      success: true,
      data: {
        message: 'Engagement scores have been recalculated successfully'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  } catch (error) {
    logger.error('Error during engagement score recalculation', { error });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to recalculate engagement scores'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
});

/**
 * Update unique views count for analytics
 * POST /maintenance/update-unique-views
 */
router.post('/update-unique-views', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    logger.info('Starting unique views update', { userId: req.user?.userId });
    
    await analyticsService.updateUniqueViews();
    
    logger.info('Unique views update completed successfully');
    
    res.json({
      success: true,
      data: {
        message: 'Unique views have been updated successfully'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  } catch (error) {
    logger.error('Error during unique views update', { error });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update unique views'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
});

/**
 * Get system integration status
 * GET /maintenance/status
 */
router.get('/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const healthStatus = await integrationService.healthCheck();
    
    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    } as APIResponse);
  } catch (error) {
    logger.error('Error getting system status', { error });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get system status'
      },
      timestamp: new Date().toISOString()
    } as APIResponse);
  }
});

export default router;