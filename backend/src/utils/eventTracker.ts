import { Request } from 'express';
import { analyticsService } from '../services/analyticsService';
import { AnalyticsEvent } from '../types';

export class EventTracker {
  /**
   * Track a page view event
   */
  static async trackView(req: Request, projectId: string, userId?: string): Promise<void> {
    const event: AnalyticsEvent = {
      userId,
      projectId,
      action: 'VIEW',
      sessionId: req.sessionID || req.headers['x-session-id'] as string,
      referrer: req.headers.referer,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    };

    await analyticsService.trackEvent(event);
  }

  /**
   * Track a like event
   */
  static async trackLike(req: Request, projectId: string, userId: string): Promise<void> {
    const event: AnalyticsEvent = {
      userId,
      projectId,
      action: 'LIKE',
      sessionId: req.sessionID || req.headers['x-session-id'] as string,
      timestamp: new Date(),
    };

    await analyticsService.trackEvent(event);
  }

  /**
   * Track a follow event
   */
  static async trackFollow(req: Request, followedUserId: string, followerId: string): Promise<void> {
    const event: AnalyticsEvent = {
      userId: followerId,
      action: 'FOLLOW',
      sessionId: req.sessionID || req.headers['x-session-id'] as string,
      timestamp: new Date(),
    };

    await analyticsService.trackEvent(event);
  }

  /**
   * Track a share event
   */
  static async trackShare(req: Request, projectId: string, userId?: string): Promise<void> {
    const event: AnalyticsEvent = {
      userId,
      projectId,
      action: 'SHARE',
      sessionId: req.sessionID || req.headers['x-session-id'] as string,
      timestamp: new Date(),
    };

    await analyticsService.trackEvent(event);
  }

  /**
   * Extract session ID from request
   */
  static getSessionId(req: Request): string {
    return req.sessionID || 
           req.headers['x-session-id'] as string || 
           req.ip + '-' + Date.now();
  }

  /**
   * Extract user agent information
   */
  static getUserAgent(req: Request): string | undefined {
    return req.headers['user-agent'];
  }

  /**
   * Extract referrer information
   */
  static getReferrer(req: Request): string | undefined {
    return req.headers.referer;
  }

  /**
   * Batch track multiple events
   */
  static async trackBatch(events: AnalyticsEvent[]): Promise<void> {
    const promises = events.map(event => analyticsService.trackEvent(event));
    await Promise.allSettled(promises);
  }
}

/**
 * Middleware to automatically track page views
 */
export const trackViewMiddleware = (projectIdParam: string = 'id') => {
  return async (req: Request, res: any, next: any) => {
    try {
      const projectId = req.params[projectIdParam];
      const userId = (req as any).user?.userId;

      if (projectId) {
        // Track asynchronously to not block the request
        EventTracker.trackView(req, projectId, userId).catch(error => {
          console.error('Error tracking view:', error);
        });
      }

      next();
    } catch (error) {
      console.error('Error in track view middleware:', error);
      next();
    }
  };
};

/**
 * Utility to create analytics event from request
 */
export const createEventFromRequest = (
  req: Request,
  action: 'VIEW' | 'LIKE' | 'FOLLOW' | 'SHARE',
  projectId?: string,
  userId?: string
): AnalyticsEvent => {
  return {
    userId,
    projectId,
    action,
    sessionId: EventTracker.getSessionId(req),
    referrer: EventTracker.getReferrer(req),
    userAgent: EventTracker.getUserAgent(req),
    timestamp: new Date(),
  };
};