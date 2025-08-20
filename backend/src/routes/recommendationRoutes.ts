import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import {
  getSimilarProjects,
  getTrendingProjects,
  getPersonalizedRecommendations,
  trackRecommendationClick,
  regenerateEmbeddings
} from '../controllers/recommendationController';

const router = Router();

/**
 * GET /recommendations/similar/:projectId
 * Get projects similar to the specified project
 * Query params:
 * - limit: number (1-50, default: 10)
 * - excludeCreator: boolean (default: false)
 */
router.get('/similar/:projectId', optionalAuth, getSimilarProjects);

/**
 * GET /recommendations/trending
 * Get trending projects based on engagement velocity
 * Query params:
 * - timeWindow: 'day' | 'week' | 'month' (default: 'week')
 * - limit: number (1-50, default: 20)
 */
router.get('/trending', getTrendingProjects);

/**
 * GET /recommendations/personalized
 * Get personalized recommendations for the authenticated user
 * Requires authentication
 * Query params:
 * - limit: number (1-50, default: 15)
 */
router.get('/personalized', authenticateToken, getPersonalizedRecommendations);

/**
 * POST /recommendations/track-click
 * Track a recommendation click for optimization
 * Requires authentication
 * Body:
 * - projectId: string
 * - recommendationType: string
 * - position: number
 */
router.post('/track-click', authenticateToken, trackRecommendationClick);

/**
 * POST /recommendations/regenerate-embeddings
 * Regenerate embeddings for all projects (admin endpoint)
 * Requires authentication and admin role
 */
router.post('/regenerate-embeddings', authenticateToken, regenerateEmbeddings);

export default router;