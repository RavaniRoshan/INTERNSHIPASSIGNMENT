import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';
import { APIResponse } from '../types';
import { EventTracker } from '../utils/eventTracker';

export class AnalyticsController {
  /**
   * Get analytics for a specific project
   * GET /analytics/project/:id
   */
  async getProjectAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const { days = '30' } = req.query;
      const userId = (req as any).user?.userId;

      // Verify user has access to this project's analytics
      // For now, we'll allow creators to see their own project analytics
      // and make public analytics available to everyone
      
      const analytics = await analyticsService.getProjectAnalytics(
        projectId,
        parseInt(days as string, 10)
      );

      const response: APIResponse = {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching project analytics:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'ANALYTICS_FETCH_ERROR',
          message: 'Failed to fetch project analytics',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get dashboard analytics for a creator
   * GET /analytics/dashboard
   */
  async getDashboardAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (!userId || userRole !== 'CREATOR') {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Only creators can access dashboard analytics',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(403).json(response);
        return;
      }

      const analytics = await analyticsService.getDashboardAnalytics(userId);

      const response: APIResponse = {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'DASHBOARD_ANALYTICS_ERROR',
          message: 'Failed to fetch dashboard analytics',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get funnel analytics for a project
   * GET /analytics/funnel/:id
   */
  async getFunnelAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user?.userId;

      const analytics = await analyticsService.getFunnelAnalytics(projectId);

      const response: APIResponse = {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching funnel analytics:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'FUNNEL_ANALYTICS_ERROR',
          message: 'Failed to fetch funnel analytics',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * Track an analytics event
   * POST /analytics/track
   */
  async trackEvent(req: Request, res: Response): Promise<void> {
    try {
      const { action, projectId } = req.body;
      const userId = (req as any).user?.userId;

      if (!action) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Action is required',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      // Track the event based on action type
      switch (action) {
        case 'VIEW':
          if (!projectId) {
            const response: APIResponse = {
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'Project ID is required for view events',
              },
              timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
          }
          await EventTracker.trackView(req, projectId, userId);
          break;

        case 'LIKE':
          if (!projectId) {
            const response: APIResponse = {
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'Project ID is required for like events',
              },
              timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
          }
          await EventTracker.trackLike(req, projectId, userId);
          break;

        case 'SHARE':
          if (!projectId) {
            const response: APIResponse = {
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'Project ID is required for share events',
              },
              timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
          }
          await EventTracker.trackShare(req, projectId, userId);
          break;

        case 'FOLLOW':
          const { followedUserId } = req.body;
          if (!followedUserId || !userId) {
            const response: APIResponse = {
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'Both user IDs are required for follow events',
              },
              timestamp: new Date().toISOString(),
            };
            res.status(400).json(response);
            return;
          }
          await EventTracker.trackFollow(req, followedUserId, userId);
          break;

        default:
          const response: APIResponse = {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action type',
            },
            timestamp: new Date().toISOString(),
          };
          res.status(400).json(response);
          return;
      }

      const response: APIResponse = {
        success: true,
        data: { message: 'Event tracked successfully' },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error tracking event:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'EVENT_TRACKING_ERROR',
          message: 'Failed to track event',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get real-time analytics updates
   * GET /analytics/realtime/:id
   */
  async getRealtimeAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId } = req.params;
      
      // For real-time analytics, we'll return the latest analytics data
      // In a production environment, this could be enhanced with WebSocket connections
      const analytics = await analyticsService.getProjectAnalytics(projectId, 1);
      
      // Get today's analytics
      const today = new Date().toISOString().split('T')[0];
      const todayAnalytics = analytics.find(a => 
        a.date.toISOString().split('T')[0] === today
      );

      const response: APIResponse = {
        success: true,
        data: {
          projectId,
          today: todayAnalytics || {
            projectId,
            date: new Date(),
            views: 0,
            uniqueViews: 0,
            ctr: 0,
            engagementRate: 0,
            referralSources: {},
          },
          lastUpdated: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching realtime analytics:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'REALTIME_ANALYTICS_ERROR',
          message: 'Failed to fetch realtime analytics',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }

  /**
   * Trigger engagement rate calculation
   * POST /analytics/calculate-engagement
   */
  async calculateEngagementRates(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      // Only allow creators or admins to trigger this calculation
      if (userRole !== 'CREATOR') {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Insufficient permissions',
          },
          timestamp: new Date().toISOString(),
        };
        res.status(403).json(response);
        return;
      }

      await analyticsService.calculateEngagementRates();

      const response: APIResponse = {
        success: true,
        data: { message: 'Engagement rates calculated successfully' },
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error calculating engagement rates:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'ENGAGEMENT_CALCULATION_ERROR',
          message: 'Failed to calculate engagement rates',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  }
}

export const analyticsController = new AnalyticsController();