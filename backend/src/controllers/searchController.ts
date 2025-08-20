import { Request, Response } from 'express';
import { z } from 'zod';
import { searchService, SearchQuery } from '../services/searchService';
import { APIResponse } from '../types';

// Validation schemas
const searchQuerySchema = z.object({
  query: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional().transform(val => 
    val ? (Array.isArray(val) ? val : [val]) : undefined
  ),
  techStack: z.union([z.string(), z.array(z.string())]).optional().transform(val => 
    val ? (Array.isArray(val) ? val : [val]) : undefined
  ),
  sortBy: z.enum(['relevance', 'date', 'popularity']).optional().default('relevance'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20)
});

const suggestionsQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
  limit: z.coerce.number().min(1).max(20).optional().default(5)
});

export class SearchController {
  /**
   * Search for projects
   * GET /search
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      // Validate request query parameters
      const validationResult = searchQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validationResult.error.issues
          },
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(response);
      }

      // Use validated data directly (arrays are already handled by schema transform)
      const searchQuery: SearchQuery = validationResult.data;

      const results = await searchService.search(searchQuery);

      const response: APIResponse = {
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Search error:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to perform search',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get search suggestions
   * GET /search/suggestions
   */
  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      // Validate request query parameters
      const validationResult = suggestionsQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validationResult.error.issues
          },
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(response);
      }

      const { query, limit } = validationResult.data;
      const suggestions = await searchService.getSuggestions(query, limit);

      const response: APIResponse = {
        success: true,
        data: {
          suggestions
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Suggestions error:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'Failed to get suggestions',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get search index statistics
   * GET /search/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await searchService.getStats();

      const response: APIResponse = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      console.error('Search stats error:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get search statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }

  /**
   * Reindex all projects (admin endpoint)
   * POST /search/reindex
   */
  async reindexProjects(req: Request, res: Response): Promise<void> {
    try {
      // This would typically be an admin-only endpoint
      // For now, we'll implement a basic version
      
      // Import here to avoid circular dependencies
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {
        // Get all published projects with creator info
        const projects = await prisma.project.findMany({
          where: {
            isPublished: true
          },
          include: {
            creator: {
              select: {
                name: true
              }
            }
          }
        });

        // Reindex all projects
        await searchService.indexProjects(projects);

        const response: APIResponse = {
          success: true,
          data: {
            message: `Successfully reindexed ${projects.length} projects`,
            count: projects.length
          },
          timestamp: new Date().toISOString()
        };

        res.json(response);
      } finally {
        await prisma.$disconnect();
      }
    } catch (error) {
      console.error('Reindex error:', error);
      const response: APIResponse = {
        success: false,
        error: {
          code: 'REINDEX_ERROR',
          message: 'Failed to reindex projects',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  }
}

export const searchController = new SearchController();