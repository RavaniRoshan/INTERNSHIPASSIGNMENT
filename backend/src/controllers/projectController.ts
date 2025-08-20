import { Request, Response } from 'express';
import { projectService } from '../services/projectService';
import { integrationService } from '../services/integrationService';
import { projectCreateSchema, projectUpdateSchema } from '../utils/validation';
import { APIResponse } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProjectController {
  async createProject(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'CREATOR') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only creators can create projects'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const validation = projectCreateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid project data',
            details: validation.error.issues
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Get creator information for integration
      const creator = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!creator) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Creator not found'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Use integration service for full system integration
      const project = await integrationService.handleProjectCreation(userId, validation.data, creator);

      res.status(201).json({
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create project'
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project ID is required'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Determine if we should include unpublished projects
      // Only the creator can see their own unpublished projects
      const includeUnpublished = Boolean(userId && userRole === 'CREATOR');
      const project = await projectService.getProjectById(id, includeUnpublished);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // If the project is unpublished, only the creator can view it
      if (!project.isPublished && project.creatorId !== userId) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Track engagement and increment view count for published projects (but not for the creator viewing their own project)
      if (project.isPublished && project.creatorId !== userId) {
        await projectService.incrementViewCount(id);
        
        // Track the view engagement
        if (userId) {
          const sessionId = req.headers['x-session-id'] as string || `session_${Date.now()}`;
          const referrer = req.headers.referer;
          
          await integrationService.handleUserEngagement(
            userId,
            id,
            'VIEW',
            sessionId,
            referrer
          );
        }
      }

      res.json({
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch project'
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'CREATOR') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only creators can update projects'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project ID is required'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const validation = projectUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid project data',
            details: validation.error.issues
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Get creator information for integration
      const creator = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!creator) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Creator not found'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Use integration service for full system integration
      const project = await integrationService.handleProjectUpdate(id, userId, validation.data, creator);

      res.json({
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      console.error('Error updating project:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Project not found') {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Project not found'
            },
            timestamp: new Date().toISOString()
          } as APIResponse);
        }
        
        if (error.message.includes('Unauthorized')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: error.message
            },
            timestamp: new Date().toISOString()
          } as APIResponse);
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update project'
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'CREATOR') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only creators can delete projects'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project ID is required'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      // Use integration service for full system cleanup
      await integrationService.handleProjectDeletion(id, userId);

      res.json({
        success: true,
        data: { message: 'Project deleted successfully' },
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      console.error('Error deleting project:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Project not found') {
          return res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Project not found'
            },
            timestamp: new Date().toISOString()
          } as APIResponse);
        }
        
        if (error.message.includes('Unauthorized')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: error.message
            },
            timestamp: new Date().toISOString()
          } as APIResponse);
        }
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete project'
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  async getCreatorProjects(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'CREATOR') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only creators can access this endpoint'
          },
          timestamp: new Date().toISOString()
        } as APIResponse);
      }

      const projects = await projectService.getProjectsByCreator(userId, true);

      res.json({
        success: true,
        data: projects,
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      console.error('Error fetching creator projects:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch projects'
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  async getPublishedProjects(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50 items per page

      const result = await projectService.getPublishedProjects(page, limit);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      console.error('Error fetching published projects:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch projects'
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
}

export const projectController = new ProjectController();