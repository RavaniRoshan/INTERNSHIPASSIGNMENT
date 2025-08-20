import { PrismaClient, EngagementAction } from '@prisma/client';
import { AnalyticsEvent, ProjectAnalyticsData, DashboardAnalytics, FunnelAnalytics } from '../types';

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Track a user engagement event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Record the engagement event
      await this.prisma.userEngagement.create({
        data: {
          userId: event.userId || '',
          projectId: event.projectId || '',
          action: event.action as EngagementAction,
          sessionId: event.sessionId,
          timestamp: event.timestamp || new Date(),
        },
      });

      // Update project view count if it's a view event
      if (event.action === 'VIEW' && event.projectId) {
        await this.prisma.project.update({
          where: { id: event.projectId },
          data: {
            viewCount: {
              increment: 1,
            },
          },
        });
      }

      // Aggregate daily analytics
      if (event.projectId) {
        await this.aggregateDailyAnalytics(event.projectId, event.referrer);
      }
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  /**
   * Aggregate daily analytics for a project
   */
  private async aggregateDailyAnalytics(projectId: string, referrer?: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get or create today's analytics record
      const existingAnalytics = await this.prisma.projectAnalytics.findUnique({
        where: {
          projectId_date: {
            projectId,
            date: today,
          },
        },
      });

      if (existingAnalytics) {
        // Update existing record
        const referralSources = existingAnalytics.referralSources as { [key: string]: number } || {};
        if (referrer) {
          const domain = this.extractDomain(referrer);
          referralSources[domain] = (referralSources[domain] || 0) + 1;
        }

        await this.prisma.projectAnalytics.update({
          where: {
            projectId_date: {
              projectId,
              date: today,
            },
          },
          data: {
            views: {
              increment: 1,
            },
            referralSources: referralSources,
          },
        });
      } else {
        // Create new record
        const referralSources: { [key: string]: number } = {};
        if (referrer) {
          const domain = this.extractDomain(referrer);
          referralSources[domain] = 1;
        }

        await this.prisma.projectAnalytics.create({
          data: {
            projectId,
            date: today,
            views: 1,
            uniqueViews: 1,
            ctr: 0,
            engagementRate: 0,
            referralSources: referralSources,
          },
        });
      }
    } catch (error) {
      console.error('Error aggregating daily analytics:', error);
    }
  }

  /**
   * Get project analytics for a specific project
   */
  async getProjectAnalytics(projectId: string, days: number = 30): Promise<ProjectAnalyticsData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const analytics = await this.prisma.projectAnalytics.findMany({
        where: {
          projectId,
          date: {
            gte: startDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      return analytics.map(record => ({
        projectId: record.projectId,
        date: record.date,
        views: record.views,
        uniqueViews: record.uniqueViews,
        ctr: record.ctr,
        engagementRate: record.engagementRate,
        referralSources: record.referralSources as { [source: string]: number } || {},
      }));
    } catch (error) {
      console.error('Error fetching project analytics:', error);
      throw error;
    }
  }

  /**
   * Get dashboard analytics for a creator
   */
  async getDashboardAnalytics(creatorId: string): Promise<DashboardAnalytics> {
    try {
      // Get creator's projects
      const projects = await this.prisma.project.findMany({
        where: { creatorId },
        select: { id: true, title: true, viewCount: true },
      });

      const projectIds = projects.map(p => p.id);

      // Get total followers
      const totalFollowers = await this.prisma.follow.count({
        where: { followingId: creatorId },
      });

      // Get total views
      const totalViews = projects.reduce((sum, project) => sum + project.viewCount, 0);

      // Get views this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const monthlyAnalytics = await this.prisma.projectAnalytics.findMany({
        where: {
          projectId: { in: projectIds },
          date: { gte: thisMonth },
        },
      });

      const viewsThisMonth = monthlyAnalytics.reduce((sum, record) => sum + record.views, 0);

      // Get top projects with engagement rates
      const topProjects = await this.getTopProjects(projectIds);

      // Get views trend (last 30 days)
      const viewsTrend = await this.getViewsTrend(projectIds, 30);

      // Get engagement trend (last 30 days)
      const engagementTrend = await this.getEngagementTrend(projectIds, 30);

      return {
        totalViews,
        totalProjects: projects.length,
        totalFollowers,
        viewsThisMonth,
        topProjects,
        viewsTrend,
        engagementTrend,
      };
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Get funnel analytics for a project
   */
  async getFunnelAnalytics(projectId: string): Promise<FunnelAnalytics> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { viewCount: true, creatorId: true },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Count engagements (likes, shares)
      const engagements = await this.prisma.userEngagement.count({
        where: {
          projectId,
          action: { in: ['LIKE', 'SHARE'] },
        },
      });

      // Count follows to the creator from this project
      const follows = await this.prisma.follow.count({
        where: { followingId: project.creatorId },
      });

      const conversionRate = project.viewCount > 0 ? (follows / project.viewCount) * 100 : 0;

      return {
        projectId,
        views: project.viewCount,
        engagements,
        follows,
        conversionRate,
      };
    } catch (error) {
      console.error('Error fetching funnel analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement rate for projects
   */
  async calculateEngagementRates(): Promise<void> {
    try {
      const projects = await this.prisma.project.findMany({
        select: { id: true, viewCount: true },
      });

      for (const project of projects) {
        const engagements = await this.prisma.userEngagement.count({
          where: {
            projectId: project.id,
            action: { in: ['LIKE', 'SHARE', 'FOLLOW'] },
          },
        });

        const engagementRate = project.viewCount > 0 ? (engagements / project.viewCount) * 100 : 0;

        await this.prisma.project.update({
          where: { id: project.id },
          data: { engagementScore: engagementRate },
        });
      }
    } catch (error) {
      console.error('Error calculating engagement rates:', error);
      throw error;
    }
  }

  /**
   * Get top projects by views and engagement
   */
  private async getTopProjects(projectIds: string[]): Promise<Array<{
    id: string;
    title: string;
    views: number;
    engagementRate: number;
  }>> {
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        title: true,
        viewCount: true,
        engagementScore: true,
      },
      orderBy: [
        { viewCount: 'desc' },
        { engagementScore: 'desc' },
      ],
      take: 5,
    });

    return projects.map(project => ({
      id: project.id,
      title: project.title,
      views: project.viewCount,
      engagementRate: project.engagementScore,
    }));
  }

  /**
   * Get views trend over time
   */
  private async getViewsTrend(projectIds: string[], days: number): Promise<Array<{
    date: string;
    views: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await this.prisma.projectAnalytics.findMany({
      where: {
        projectId: { in: projectIds },
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date and sum views
    const trendMap = new Map<string, number>();
    analytics.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + record.views);
    });

    return Array.from(trendMap.entries()).map(([date, views]) => ({
      date,
      views,
    }));
  }

  /**
   * Get engagement trend over time
   */
  private async getEngagementTrend(projectIds: string[], days: number): Promise<Array<{
    date: string;
    engagements: number;
  }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const engagements = await this.prisma.userEngagement.findMany({
      where: {
        projectId: { in: projectIds },
        timestamp: { gte: startDate },
        action: { in: ['LIKE', 'SHARE', 'FOLLOW'] },
      },
      select: { timestamp: true },
    });

    // Group by date and count engagements
    const trendMap = new Map<string, number>();
    engagements.forEach(engagement => {
      const dateKey = engagement.timestamp.toISOString().split('T')[0];
      trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
    });

    return Array.from(trendMap.entries()).map(([date, engagements]) => ({
      date,
      engagements,
    }));
  }

  /**
   * Extract domain from referrer URL
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'direct';
    }
  }

  /**
   * Update unique views count
   */
  async updateUniqueViews(): Promise<void> {
    try {
      const analytics = await this.prisma.projectAnalytics.findMany({
        where: { uniqueViews: 0 },
      });

      for (const record of analytics) {
        const uniqueViews = await this.prisma.userEngagement.groupBy({
          by: ['userId'],
          where: {
            projectId: record.projectId,
            action: 'VIEW',
            timestamp: {
              gte: record.date,
              lt: new Date(record.date.getTime() + 24 * 60 * 60 * 1000),
            },
          },
        });

        await this.prisma.projectAnalytics.update({
          where: {
            projectId_date: {
              projectId: record.projectId,
              date: record.date,
            },
          },
          data: {
            uniqueViews: uniqueViews.length,
          },
        });
      }
    } catch (error) {
      console.error('Error updating unique views:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();