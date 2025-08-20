import { Request, Response } from 'express';
import { z } from 'zod';
import { recommendationService } from '../services/recommendationService';
import { embeddingService } from '../services/embeddingService';

// Validation schemas
const similarProjectsSchema = z.object({
  projectId: z.string().cuid(),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  excludeCreator: z.coerce.boolean().optional().default(false)
});

const trendingProjectsSchema = z.object({
  timeWindow: z.enum(['day', 'week', 'month']).optional().default('week'),
  limit: z.coerce.number().min(1).max(50).optional().default(20)
});

const personalizedRecommendationsSchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(15)
});

const trackClickSchema = z.object({
  projectId: z.string().cuid(),
  recommendationType: z.string(),
  position: z.number().min(0)
});

/**
 * Get similar projects based on content similarity
 */
export const getSimilarProjects = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const query = similarProjectsSchema.parse({
      projectId,
      ...req.query
    });

    const excludeCreatorId = query.excludeCreator ? req.user?.id : undefined;
    
    const similarProjects = await recommendationService.getSimilarProjects(
      query.projectId,
      query.limit,
      excludeCreatorId
    );

    res.json({
      success: true,
      data: {
        projectId: query.projectId,
        similarProjects: similarProjects.map(result => ({
          project: result.project,
          similarity: result.similarity
        })),
        count: similarProjects.length
      }
    });
  } catch (error) {
    console.error('Error getting similar projects:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get similar projects'
      }
    });
  }
};

/**
 * Get trending projects based on engagement velocity
 */
export const getTrendingProjects = async (req: Request, res: Response) => {
  try {
    const query = trendingProjectsSchema.parse(req.query);
    
    const trendingProjects = await recommendationService.getTrendingProjects(
      query.timeWindow,
      query.limit
    );

    res.json({
      success: true,
      data: {
        timeWindow: query.timeWindow,
        projects: trendingProjects.map(project => ({
          id: project.id,
          title: project.title,
          description: project.description,
          coverImage: project.coverImage,
          tags: project.tags,
          techStack: project.techStack,
          viewCount: project.viewCount,
          engagementScore: project.engagementScore,
          engagementVelocity: project.engagementVelocity,
          recentViews: project.recentViews,
          recentLikes: project.recentLikes,
          recentFollows: project.recentFollows,
          createdAt: project.createdAt,
          creatorId: project.creatorId
        })),
        count: trendingProjects.length
      }
    });
  } catch (error) {
    console.error('Error getting trending projects:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get trending projects'
      }
    });
  }
};

/**
 * Get personalized recommendations for the authenticated user
 */
export const getPersonalizedRecommendations = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required for personalized recommendations'
        }
      });
    }

    const query = personalizedRecommendationsSchema.parse(req.query);
    
    const recommendations = await recommendationService.getPersonalizedRecommendations(
      req.user.id,
      query.limit
    );

    res.json({
      success: true,
      data: {
        userId: req.user.id,
        recommendations: recommendations.map(rec => ({
          project: {
            id: rec.project.id,
            title: rec.project.title,
            description: rec.project.description,
            coverImage: rec.project.coverImage,
            tags: rec.project.tags,
            techStack: rec.project.techStack,
            viewCount: rec.project.viewCount,
            engagementScore: rec.project.engagementScore,
            createdAt: rec.project.createdAt,
            creatorId: rec.project.creatorId
          },
          score: rec.score,
          reason: rec.reason
        })),
        count: recommendations.length
      }
    });
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get personalized recommendations'
      }
    });
  }
};

/**
 * Track recommendation click for optimization
 */
export const trackRecommendationClick = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const data = trackClickSchema.parse(req.body);
    
    await recommendationService.trackRecommendationClick(
      req.user.id,
      data.projectId,
      data.recommendationType,
      data.position
    );

    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking recommendation click:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to track click'
      }
    });
  }
};

/**
 * Regenerate embeddings for all projects (admin endpoint)
 */
export const regenerateEmbeddings = async (req: Request, res: Response) => {
  try {
    // This should be an admin-only endpoint in production
    if (!req.user || req.user.role !== 'CREATOR') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      });
    }

    // Run embedding generation in background
    embeddingService.updateAllProjectEmbeddings().catch(error => {
      console.error('Background embedding update failed:', error);
    });

    res.json({
      success: true,
      message: 'Embedding regeneration started in background'
    });
  } catch (error) {
    console.error('Error starting embedding regeneration:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to start embedding regeneration'
      }
    });
  }
};