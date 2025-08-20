import { Project, UserEngagement, EngagementAction } from '@prisma/client';
import { prisma } from '../utils/database';
import { embeddingService, SimilarityResult } from './embeddingService';

export interface TrendingProject extends Project {
  engagementVelocity: number;
  recentViews: number;
  recentLikes: number;
  recentFollows: number;
}

export interface PersonalizedRecommendation {
  project: Project;
  score: number;
  reason: 'similar_content' | 'followed_creator' | 'trending' | 'similar_engagement';
}

/**
 * Service for generating project recommendations
 */
export class RecommendationService {
  /**
   * Get similar projects based on content similarity
   */
  async getSimilarProjects(
    projectId: string, 
    limit: number = 10,
    excludeCreatorId?: string
  ): Promise<SimilarityResult[]> {
    const similarProjects = await embeddingService.findSimilarProjects(projectId, limit * 2);
    
    // Filter out projects from the same creator if specified
    let filteredProjects = similarProjects;
    if (excludeCreatorId) {
      filteredProjects = similarProjects.filter(
        result => result.project?.creatorId !== excludeCreatorId
      );
    }

    return filteredProjects.slice(0, limit);
  }

  /**
   * Get trending projects based on engagement velocity
   */
  async getTrendingProjects(
    timeWindow: 'day' | 'week' | 'month' = 'week',
    limit: number = 20
  ): Promise<TrendingProject[]> {
    const timeWindowHours = this.getTimeWindowHours(timeWindow);
    const cutoffDate = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    // Get projects with their recent engagement metrics
    const projectsWithEngagement = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      description: string;
      coverImage: string;
      tags: string[];
      techStack: string[];
      viewCount: number;
      engagementScore: number;
      createdAt: Date;
      updatedAt: Date;
      creatorId: string;
      isPublished: boolean;
      recentViews: number;
      recentLikes: number;
      recentFollows: number;
      projectAge: number;
    }>>`
      SELECT 
        p.*,
        COALESCE(engagement_stats.recent_views, 0) as "recentViews",
        COALESCE(engagement_stats.recent_likes, 0) as "recentLikes",
        COALESCE(engagement_stats.recent_follows, 0) as "recentFollows",
        EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 as "projectAge"
      FROM projects p
      LEFT JOIN (
        SELECT 
          ue.project_id,
          COUNT(CASE WHEN ue.action = 'VIEW' THEN 1 END) as recent_views,
          COUNT(CASE WHEN ue.action = 'LIKE' THEN 1 END) as recent_likes,
          COUNT(CASE WHEN ue.action = 'FOLLOW' THEN 1 END) as recent_follows
        FROM user_engagements ue
        WHERE ue.timestamp >= ${cutoffDate}
        GROUP BY ue.project_id
      ) engagement_stats ON p.id = engagement_stats.project_id
      WHERE p.is_published = true
      ORDER BY (
        COALESCE(engagement_stats.recent_views, 0) * 1.0 +
        COALESCE(engagement_stats.recent_likes, 0) * 3.0 +
        COALESCE(engagement_stats.recent_follows, 0) * 5.0
      ) / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600, 1) DESC
      LIMIT ${limit}
    `;

    return projectsWithEngagement.map(project => ({
      ...project,
      mediaGallery: project.mediaGallery || null,
      content: project.content || null,
      coverImage: project.coverImage || null,
      description: project.description || null,
      engagementVelocity: this.calculateEngagementVelocity(
        project.recentViews,
        project.recentLikes,
        project.recentFollows,
        project.projectAge
      )
    })) as TrendingProject[];
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 15
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Get user's engagement history to understand preferences
    const userEngagements = await prisma.userEngagement.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    // Get projects from followed creators
    const followedCreatorProjects = await this.getFollowedCreatorProjects(userId, 5);
    recommendations.push(...followedCreatorProjects);

    // Get projects similar to ones the user has engaged with
    const similarContentProjects = await this.getSimilarContentRecommendations(
      userEngagements,
      userId,
      8
    );
    recommendations.push(...similarContentProjects);

    // Add some trending projects for discovery
    const trendingProjects = await this.getTrendingProjects('week', 5);
    const trendingRecommendations = trendingProjects
      .filter(project => project.creatorId !== userId)
      .slice(0, 2)
      .map(project => ({
        project: project as Project,
        score: project.engagementVelocity,
        reason: 'trending' as const
      }));
    recommendations.push(...trendingRecommendations);

    // Remove duplicates and sort by score
    const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
    return uniqueRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate engagement velocity score
   */
  private calculateEngagementVelocity(
    views: number,
    likes: number,
    follows: number,
    ageInHours: number
  ): number {
    const weightedEngagement = views * 1.0 + likes * 3.0 + follows * 5.0;
    const timeDecay = Math.max(ageInHours, 1); // Prevent division by zero
    return weightedEngagement / timeDecay;
  }

  /**
   * Get projects from creators the user follows
   */
  private async getFollowedCreatorProjects(
    userId: string,
    limit: number
  ): Promise<PersonalizedRecommendation[]> {
    const followedProjects = await prisma.project.findMany({
      where: {
        isPublished: true,
        creator: {
          followers: {
            some: { followerId: userId }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return followedProjects.map(project => ({
      project,
      score: 0.8, // High base score for followed creators
      reason: 'followed_creator' as const
    }));
  }

  /**
   * Get recommendations based on similar content to user's engagement history
   */
  private async getSimilarContentRecommendations(
    userEngagements: Array<UserEngagement & { project: Project }>,
    userId: string,
    limit: number
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Get the most engaged-with projects (likes and follows have higher weight)
    const topEngagedProjects = userEngagements
      .filter(engagement => ['LIKE', 'FOLLOW'].includes(engagement.action))
      .slice(0, 5);

    for (const engagement of topEngagedProjects) {
      try {
        const similarProjects = await embeddingService.findSimilarProjects(
          engagement.projectId,
          3,
          0.2 // Lower threshold for more diverse recommendations
        );

        const filteredSimilar = similarProjects
          .filter(result => result.project?.creatorId !== userId)
          .map(result => ({
            project: result.project!,
            score: result.similarity * 0.7, // Moderate score for similar content
            reason: 'similar_content' as const
          }));

        recommendations.push(...filteredSimilar);
      } catch (error) {
        console.error(`Error getting similar projects for ${engagement.projectId}:`, error);
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * Remove duplicate recommendations, keeping the one with highest score
   */
  private deduplicateRecommendations(
    recommendations: PersonalizedRecommendation[]
  ): PersonalizedRecommendation[] {
    const projectMap = new Map<string, PersonalizedRecommendation>();

    for (const rec of recommendations) {
      const existing = projectMap.get(rec.project.id);
      if (!existing || rec.score > existing.score) {
        projectMap.set(rec.project.id, rec);
      }
    }

    return Array.from(projectMap.values());
  }

  /**
   * Convert time window string to hours
   */
  private getTimeWindowHours(timeWindow: 'day' | 'week' | 'month'): number {
    switch (timeWindow) {
      case 'day':
        return 24;
      case 'week':
        return 24 * 7;
      case 'month':
        return 24 * 30;
      default:
        return 24 * 7;
    }
  }

  /**
   * Track recommendation click for optimization
   */
  async trackRecommendationClick(
    userId: string,
    projectId: string,
    recommendationType: string,
    position: number
  ): Promise<void> {
    // Store click tracking data for future recommendation optimization
    await prisma.userEngagement.create({
      data: {
        userId,
        projectId,
        action: EngagementAction.VIEW,
        sessionId: `rec_${recommendationType}_${position}_${Date.now()}`
      }
    });
  }
}

export const recommendationService = new RecommendationService();