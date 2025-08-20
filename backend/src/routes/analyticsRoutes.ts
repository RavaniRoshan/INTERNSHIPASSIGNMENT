import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';
import { trackViewMiddleware } from '../utils/eventTracker';

const router = Router();

// Public analytics endpoints (with optional authentication)
router.get('/project/:id', analyticsController.getProjectAnalytics.bind(analyticsController));
router.get('/funnel/:id', analyticsController.getFunnelAnalytics.bind(analyticsController));
router.get('/realtime/:id', analyticsController.getRealtimeAnalytics.bind(analyticsController));

// Protected analytics endpoints (require authentication)
router.get('/dashboard', authenticateToken, analyticsController.getDashboardAnalytics.bind(analyticsController));
router.post('/track', analyticsController.trackEvent.bind(analyticsController));
router.post('/calculate-engagement', authenticateToken, analyticsController.calculateEngagementRates.bind(analyticsController));

export default router;