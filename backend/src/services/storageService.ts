import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import crypto from 'crypto';
import path from 'path';

// Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'creator-portfolio-hub-uploads';

// File validation schemas
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine((type) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    return allowedTypes.includes(type);
  }, 'Invalid file type'),
  size: z.number().max(100 * 1024 * 1024), // 100MB max
});

export interface FileUploadRequest {
  filename: string;
  contentType: string;
  size: number;
  userId: string;
  projectId?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface FileMetadata {
  key: string;
  originalName: string;
  contentType: string;
  size: number;
  url: string;
  userId: string;
  projectId?: string;
}

export class StorageService {
  /**
   * Generate a presigned URL for file upload
   */
  async generatePresignedUrl(request: FileUploadRequest): Promise<PresignedUrlResponse> {
    // Validate input
    const validation = FileUploadSchema.safeParse(request);
    if (!validation.success) {
      throw new Error(`Invalid file upload request: ${validation.error.message}`);
    }

    // Generate unique key
    const fileExtension = path.extname(request.filename);
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(16).toString('hex');
    const key = `uploads/${request.userId}/${timestamp}-${randomId}${fileExtension}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: request.contentType,
      ContentLength: request.size,
      Metadata: {
        originalName: request.filename,
        userId: request.userId,
        projectId: request.projectId || '',
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    return {
      uploadUrl,
      key,
      expiresIn: 3600,
    };
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      if (!response.Metadata) {
        return null;
      }

      return {
        key,
        originalName: response.Metadata.originalname || 'unknown',
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
        url: this.getPublicUrl(key),
        userId: response.Metadata.userid || '',
        projectId: response.Metadata.projectid || undefined,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }

  /**
   * Validate file type and size
   */
  validateFile(filename: string, contentType: string, size: number): { valid: boolean; error?: string } {
    const validation = FileUploadSchema.safeParse({ filename, contentType, size });
    
    if (!validation.success) {
      return {
        valid: false,
        error: validation.error?.errors?.map(e => e.message).join(', ') || 'Validation failed',
      };
    }

    // Additional validation for file extensions
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];
    const fileExtension = path.extname(filename).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: 'File extension not allowed',
      };
    }

    // Validate content type matches extension
    const extensionTypeMap: { [key: string]: string[] } = {
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.webp': ['image/webp'],
      '.gif': ['image/gif'],
      '.mp4': ['video/mp4'],
      '.webm': ['video/webm'],
      '.mov': ['video/quicktime'],
    };

    const expectedTypes = extensionTypeMap[fileExtension];
    if (expectedTypes && !expectedTypes.includes(contentType)) {
      return {
        valid: false,
        error: 'Content type does not match file extension',
      };
    }

    return { valid: true };
  }

  /**
   * Generate thumbnail key for videos
   */
  generateThumbnailKey(originalKey: string): string {
    const keyWithoutExtension = originalKey.replace(/\.[^/.]+$/, '');
    return `${keyWithoutExtension}-thumbnail.jpg`;
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const storageService = new StorageService();