import { PrismaClient } from '@prisma/client';
import { ProjectCreateInput, ProjectUpdateInput } from '../utils/validation';
import cacheService from './cacheService';

const prisma = new PrismaClient();

export class ProjectService {
  async createProject(creatorId: string, data: ProjectCreateInput) {
    return await prisma.project.create({
      data: {
        ...data,
        creatorId,
        tags: data.tags || [],
        techStack: data.techStack || [],
        mediaGallery: data.mediaGallery || []
      },
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
  }

  async getProjectById(id: string, includeUnpublished = false): Promise<any> {
    // Try to get from cache first (only for published projects)
    if (!includeUnpublished) {
      const cached = await cacheService.getCachedProject(id);
      if (cached) {
        return cached;
      }
    }

    const project = await prisma.project.findUnique({
      where: { id },
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

    if (!project) {
      return null;
    }

    // If project is not published and we're not including unpublished, return null
    if (!project.isPublished && !includeUnpublished) {
      return null;
    }

    // Cache published projects
    if (project.isPublished && !includeUnpublished) {
      await cacheService.cacheProject(id, project);
    }

    return project;
  }

  async getProjectsByCreator(creatorId: string, includeUnpublished = true) {
    return await prisma.project.findMany({
      where: {
        creatorId,
        ...(includeUnpublished ? {} : { isPublished: true })
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            profile: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  async updateProject(id: string, creatorId: string, data: ProjectUpdateInput) {
    // First check if the project exists and belongs to the creator
    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { creatorId: true }
    });

    if (!existingProject) {
      throw new Error('Project not found');
    }

    if (existingProject.creatorId !== creatorId) {
      throw new Error('Unauthorized: You can only update your own projects');
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
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

    // Invalidate cache for this project
    await cacheService.invalidateProjectCache(id);

    return updatedProject;
  }

  async deleteProject(id: string, creatorId: string) {
    // First check if the project exists and belongs to the creator
    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { creatorId: true }
    });

    if (!existingProject) {
      throw new Error('Project not found');
    }

    if (existingProject.creatorId !== creatorId) {
      throw new Error('Unauthorized: You can only delete your own projects');
    }

    const result = await prisma.project.delete({
      where: { id }
    });

    // Invalidate cache for this project
    await cacheService.invalidateProjectCache(id);

    return result;
  }

  async getPublishedProjects(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: { isPublished: true },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              profile: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.project.count({
        where: { isPublished: true }
      })
    ]);

    return {
      projects,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  }

  async incrementViewCount(id: string) {
    return await prisma.project.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });
  }
}

export const projectService = new ProjectService();