import { Request, Response } from 'express';
import { z } from 'zod';
import { storageService } from '../services/storageService';
import { prisma } from '../utils/database';
import { uploadQueue } from '../services/uploadQueue';

// Request validation schemas
const PresignedUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string(),
  size: z.number().positive(),
  projectId: z.string().uuid().optional(),
});

const CompleteUploadRequestSchema = z.object({
  key: z.string().min(1),
  originalName: z.string().min(1),
  contentType: z.string(),
  size: z.number().positive(),
  projectId: z.string().uuid().optional(),
});

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

/**
 * Generate presigned URL for file upload
 */
export const generatePresignedUrl = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
    }

    // Validate request body
    const validation = PresignedUrlRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.errors,
        },
      });
    }

    const { filename, contentType, size, projectId } = validation.data;

    // Validate file
    const fileValidation = storageService.validateFile(filename, contentType, size);
    if (!fileValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: fileValidation.error,
        },
      });
    }

    // If projectId is provided, verify user owns the project
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          creatorId: userId,
        },
      });

      if (!project) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PROJECT_ACCESS_DENIED',
            message: 'Project not found or access denied',
          },
        });
      }
    }

    // Generate presigned URL
    const presignedUrlData = await storageService.generatePresignedUrl({
      filename,
      contentType,
      size,
      userId,
      projectId,
    });

    res.json({
      success: true,
      data: presignedUrlData,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate upload URL',
      },
    });
  }
};

/**
 * Complete file upload and store metadata
 */
export const completeUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
    }

    // Validate request body
    const validation = CompleteUploadRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.errors,
        },
      });
    }

    const { key, originalName, contentType, size, projectId } = validation.data;

    // Verify file exists in storage
    const fileExists = await storageService.fileExists(key);
    if (!fileExists) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Uploaded file not found in storage',
        },
      });
    }

    // Create file record in database
    const fileRecord = await prisma.uploadedFile.create({
      data: {
        key,
        originalName,
        contentType,
        size,
        url: storageService.getPublicUrl(key),
        userId,
        projectId,
        status: 'uploaded',
      },
    });

    // Queue background processing for optimization
    await uploadQueue.add('processFile', {
      fileId: fileRecord.id,
      key,
      contentType,
      userId,
    });

    res.json({
      success: true,
      data: {
        id: fileRecord.id,
        key: fileRecord.key,
        url: fileRecord.url,
        originalName: fileRecord.originalName,
        contentType: fileRecord.contentType,
        size: fileRecord.size,
        status: fileRecord.status,
      },
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to complete upload',
      },
    });
  }
};

/**
 * Get file upload status
 */
export const getUploadStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
    }

    const { fileId } = req.params;

    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: file.id,
        key: file.key,
        url: file.url,
        originalName: file.originalName,
        contentType: file.contentType,
        size: file.size,
        status: file.status,
        thumbnailUrl: file.thumbnailUrl,
        optimizedUrl: file.optimizedUrl,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error getting upload status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get upload status',
      },
    });
  }
};

/**
 * Delete uploaded file
 */
export const deleteUpload = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required',
        },
      });
    }

    const { fileId } = req.params;

    const file = await prisma.uploadedFile.findFirst({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
    }

    // Delete from storage
    await storageService.deleteFile(file.key);
    
    // Delete thumbnail if exists
    if (file.thumbnailUrl) {
      const thumbnailKey = storageService.generateThumbnailKey(file.key);
      await storageService.deleteFile(thumbnailKey);
    }

    // Delete from database
    await prisma.uploadedFile.delete({
      where: { id: fileId },
    });

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete file',
      },
    });
  }
};