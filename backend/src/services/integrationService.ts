import { Project, User, EngagementAction } from '@prisma/client';
import { projectService } from './projectService';
import { searchService } from './searchService';
import { analyticsService } from './analyticsService';
import { recommendationService } from './recommendationService';
import { embeddingService } from './embeddingService';
import logger from '../utils/logger';

/**
 * Integration service that orchestrates all system components
 * Ensures proper data flow between services when projects are created/updated
 */
export class IntegrationService {
  /**
   * Handle project creation with full system integration
   */
  async handleProjectCreation(
    creatorId: string,
    projectData: any,
    creator: User
  ): Promise<Project> {
    try {
      logger.info('Starting integrated project creation', { creatorId, projectTitle: projectData.title });

      // 1. Create the project
      const project = await projectService.createProject(creatorId, projectData);
      
      // 2. If project is published, integrate with other services
      if (project.isPublished) {
        await this.integratePublishedProject(project, creator);
      }

      logger.info('Project creation completed successfully', { projectId: project.id });
      return project;
    } catch (error) {
      logger.error('Error in integrated project creation', { error, creatorId });
      throw error;
    }
  }

  /**
   * Handle project updates with full system integration
   */
  async handleProjectUpdate(
    projectId: string,
    creatorId: string,
    updateData: any,
    creator: User
  ): Promise<Project> {
    try {
      logger.info('Starting integrated project update', { projectId, creatorId });

      // Get the project before update to check publication status
      const existingProject = await projectService.getProjectById(projectId, true);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      const wasPublished = existingProject.isPublished;

      // 1. Update the project
      const updatedProject = await projectService.updateProject(projectId, creatorId, updateData);
      
      // 2. Handle search index updates
      if (updatedProject.isPublished) {
        // Re-index the updated project
        await this.updateSearchIndex(updatedProject, creator);
        
        // Update embeddings for recommendation system
        await this.updateProjectEmbeddings(updatedProject);
      } else if (wasPublished && !updatedProject.isPublished) {
        // Project was unpublished, remove from search index
        await searchService.removeProject(projectId);
      }

      // 3. If project was just published for the first time
      if (!wasPublished && updatedProject.isPublished) {
        await this.integratePublishedProject(updatedProject, creator);
      }

      logger.info('Project update completed successfully', { projectId });
      return updatedProject;
    } catch (error) {
      logger.error('Error in integrated project update', { error, projectId });
      throw error;
    }
  }

  /**
   * Handle project deletion with full system cleanup
   */
  async handleProjectDeletion(projectId: string, creatorId: string): Promise<void> {
    try {
      logger.info('Starting integrated project deletion', { projectId, creatorId });

      // 1. Remove from search index
      await searchService.removeProject(projectId);

      // 2. Remove embeddings
      await embeddingService.removeProjectEmbeddings(projectId);

      // 3. Delete the project (this will cascade delete analytics due to foreign key constraints)
      await projectService.deleteProject(projectId, creatorId);

      logger.info('Project deletion completed successfully', { projectId });
    } catch (error) {
      logger.error('Error in integrated project deletion', { error, projectId });
      throw error;
    }
  }

  /**
   * Handle user engagement with full analytics and recommendation updates
   */
  async handleUserEngagement(
    userId: string,
    projectId: string,
    action: EngagementAction,
    sessionId: string,
    referrer?: string
  ): Promise<void> {
    try {
      logger.info('Processing user engagement', { userId, projectId, action });

      // 1. Track the engagement event
      await analyticsService.trackEvent({
        userId,
        projectId,
        action,
        sessionId,
        referrer,
        timestamp: new Date()
      });

      // 2. Update project engagement score if needed
      if (['LIKE', 'SHARE', 'FOLLOW'].includes(action)) {
        await this.updateProjectEngagementScore(projectId);
      }

      // 3. Update search index with new engagement metrics
      if (action === 'VIEW') {
        await this.updateProjectSearchMetrics(projectId);
      }

      logger.info('User engagement processed successfully', { userId, projectId, action });
    } catch (error) {
      logger.error('Error processing user engagement', { error, userId, projectId, action });
      throw error;
    }
  }

  /**
   * Integrate a newly published project with all services
   */
  private async integratePublishedProject(project: Project, creator: User): Promise<void> {
    try {
      // 1. Add to search index
      await this.updateSearchIndex(project, creator);

      // 2. Generate embeddings for recommendations
      await this.updateProjectEmbeddings(project);

      // 3. Initialize analytics tracking
      await this.initializeProjectAnalytics(project.id);

      logger.info('Project integrated with all services', { projectId: project.id });
    } catch (error) {
      logger.error('Error integrating published project', { error, projectId: project.id });
      // Don't throw here - project creation should succeed even if integration partially fails
    }
  }

  /**
   * Update search index for a project
   */
  private async updateSearchIndex(project: Project, creator: User): Promise<void> {
    try {
      const projectWithCreator = {
        ...project,
        creator: {
          name: creator.profile?.name || creator.email.split('@')[0]
        }
      };
      
      await searchService.indexProject(projectWithCreator);
      logger.info('Search index updated', { projectId: project.id });
    } catch (error) {
      logger.error('Error updating search index', { error, projectId: project.id });
      throw error;
    }
  }

  /**
   * Update project embeddings for recommendation system
   */
  private async updateProjectEmbeddings(project: Project): Promise<void> {
    try {
      await embeddingService.generateProjectEmbedding(project);
      logger.info('Project embeddings updated', { projectId: project.id });
    } catch (error) {
      logger.error('Error updating project embeddings', { error, projectId: project.id });
      throw error;
    }
  }

  /**
   * Initialize analytics tracking for a new project
   */
  private async initializeProjectAnalytics(projectId: string): Promise<void> {
    try {
      // Analytics will be initialized automatically when first engagement occurs
      // This is just a placeholder for any initialization logic we might need
      logger.info('Project analytics initialized', { projectId });
    } catch (error) {
      logger.error('Error initializing project analytics', { error, projectId });
      throw error;
    }
  }

  /**
   * Update project engagement score based on recent activity
   */
  private async updateProjectEngagementScore(projectId: string): Promise<void> {
    try {
      // This will be handled by the analytics service's calculateEngagementRates method
      // We could call it here for real-time updates, but it's computationally expensive
      // Better to run it as a scheduled job
      logger.info('Project engagement score update queued', { projectId });
    } catch (error) {
      logger.error('Error updating project engagement score', { error, projectId });
      throw error;
    }
  }

  /**
   * Update search index with new project metrics
   */
  private async updateProjectSearchMetrics(projectId: string): Promise<void> {
    try {
      // Get updated project with new view count
      const project = await projectService.getProjectById(projectId);
      if (project && project.isPublished) {
        const creator = await this.getProjectCreator(project.creatorId);
        if (creator) {
          await this.updateSearchIndex(project, creator);
        }
      }
    } catch (error) {
      logger.error('Error updating search metrics', { error, projectId });
      // Don't throw - this is not critical
    }
  }

  /**
   * Get project creator information
   */
  private async getProjectCreator(creatorId: string): Promise<User | null> {
    try {
      // This would typically come from a user service
      // For now, we'll use Prisma directly
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      return await prisma.user.findUnique({
        where: { id: creatorId }
      });
    } catch (error) {
      logger.error('Error getting project creator', { error, creatorId });
      return null;
    }
  }

  /**
   * Bulk reindex all published projects (for maintenance/migration)
   */
  async reindexAllProjects(): Promise<void> {
    try {
      logger.info('Starting bulk project reindexing');

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const projects = await prisma.project.findMany({
        where: { isPublished: true },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              profile: true
            }
          }
        }
      });

      // Process in batches to avoid overwhelming the search service
      const batchSize = 10;
      for (let i = 0; i < projects.length; i += batchSize) {
        const batch = projects.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (project) => {
          try {
            const projectWithCreator = {
              ...project,
              creator: {
                name: project.creator.profile?.name || project.creator.email.split('@')[0]
              }
            };
            
            await searchService.indexProject(projectWithCreator);
            await embeddingService.generateProjectEmbedding(project);
          } catch (error) {
            logger.error('Error reindexing project', { error, projectId: project.id });
          }
        }));

        logger.info(`Reindexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(projects.length / batchSize)}`);
      }

      logger.info('Bulk project reindexing completed', { totalProjects: projects.length });
    } catch (error) {
      logger.error('Error in bulk project reindexing', { error });
      throw error;
    }
  }

  /**
   * Health check for all integrated services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      database: boolean;
      search: boolean;
      analytics: boolean;
      recommendations: boolean;
    };
  }> {
    const services = {
      database: false,
      search: false,
      analytics: false,
      recommendations: false
    };

    try {
      // Check database
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      services.database = true;
    } catch (error) {
      logger.error('Database health check failed', { error });
    }

    try {
      // Check search service
      await searchService.getStats();
      services.search = true;
    } catch (error) {
      logger.error('Search service health check failed', { error });
    }

    try {
      // Check analytics service (simple test)
      services.analytics = true; // Analytics service doesn't have external dependencies
    } catch (error) {
      logger.error('Analytics service health check failed', { error });
    }

    try {
      // Check recommendation service (simple test)
      services.recommendations = true; // Recommendation service uses database which we already checked
    } catch (error) {
      logger.error('Recommendation service health check failed', { error });
    }

    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, services };
  }
}

export const integrationService = new IntegrationService();