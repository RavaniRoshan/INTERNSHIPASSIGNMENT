import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import sharp from 'sharp';
import { storageService } from './storageService';
import { prisma } from '../utils/database';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// S3 client for processing
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'creator-portfolio-hub-uploads';

// Create upload processing queue
export const uploadQueue = new Queue('upload-processing', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job data interfaces
interface ProcessFileJobData {
  fileId: string;
  key: string;
  contentType: string;
  userId: string;
}

interface OptimizeImageJobData {
  fileId: string;
  key: string;
  userId: string;
}

interface GenerateThumbnailJobData {
  fileId: string;
  key: string;
  userId: string;
}

/**
 * Process uploaded file - main entry point
 */
const processFile = async (job: Job<ProcessFileJobData>) => {
  const { fileId, key, contentType, userId } = job.data;
  
  try {
    // Update status to processing
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { status: 'processing' },
    });

    if (contentType.startsWith('image/')) {
      // Process image
      await processImage(fileId, key, userId);
    } else if (contentType.startsWith('video/')) {
      // Process video
      await processVideo(fileId, key, userId);
    }

    // Update status to completed
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { status: 'completed' },
    });

    console.log(`File processing completed for ${fileId}`);
  } catch (error) {
    console.error(`File processing failed for ${fileId}:`, error);
    
    // Update status to failed
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: { status: 'failed' },
    });
    
    throw error;
  }
};

/**
 * Process image file - optimization and thumbnail generation
 */
const processImage = async (fileId: string, key: string, userId: string) => {
  try {
    // Download original image from S3
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(response.Body as NodeJS.ReadableStream);

    // Generate optimized version
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(1920, 1080, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85, 
        progressive: true 
      })
      .toBuffer();

    // Generate thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(400, 300, { 
        fit: 'cover' 
      })
      .jpeg({ 
        quality: 80 
      })
      .toBuffer();

    // Upload optimized version
    const optimizedKey = key.replace(/\.[^/.]+$/, '-optimized.jpg');
    const optimizedUploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: optimizedKey,
      Body: optimizedBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        originalKey: key,
        userId,
        processedAt: new Date().toISOString(),
      },
    });
    await s3Client.send(optimizedUploadCommand);

    // Upload thumbnail
    const thumbnailKey = storageService.generateThumbnailKey(key);
    const thumbnailUploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        originalKey: key,
        userId,
        processedAt: new Date().toISOString(),
      },
    });
    await s3Client.send(thumbnailUploadCommand);

    // Update database with processed URLs
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: {
        optimizedUrl: storageService.getPublicUrl(optimizedKey),
        thumbnailUrl: storageService.getPublicUrl(thumbnailKey),
      },
    });

    console.log(`Image processing completed for ${fileId}`);
  } catch (error) {
    console.error(`Image processing failed for ${fileId}:`, error);
    throw error;
  }
};

/**
 * Process video file - thumbnail generation
 */
const processVideo = async (fileId: string, key: string, userId: string) => {
  try {
    // For video processing, we'll create a simple placeholder thumbnail
    // In a production environment, you would use FFmpeg or similar tool
    
    // Create a placeholder thumbnail using Sharp
    const placeholderBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 100, g: 100, b: 100 }
      }
    })
    .png()
    .composite([{
      input: Buffer.from(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#666"/>
          <circle cx="200" cy="150" r="40" fill="#fff"/>
          <polygon points="185,130 185,170 220,150" fill="#666"/>
          <text x="200" y="200" text-anchor="middle" fill="#fff" font-size="16">Video</text>
        </svg>
      `),
      top: 0,
      left: 0
    }])
    .toBuffer();

    // Upload thumbnail
    const thumbnailKey = storageService.generateThumbnailKey(key);
    const thumbnailUploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: thumbnailKey,
      Body: placeholderBuffer,
      ContentType: 'image/png',
      Metadata: {
        originalKey: key,
        userId,
        processedAt: new Date().toISOString(),
      },
    });
    await s3Client.send(thumbnailUploadCommand);

    // Update database with thumbnail URL
    await prisma.uploadedFile.update({
      where: { id: fileId },
      data: {
        thumbnailUrl: storageService.getPublicUrl(thumbnailKey),
      },
    });

    console.log(`Video processing completed for ${fileId}`);
  } catch (error) {
    console.error(`Video processing failed for ${fileId}:`, error);
    throw error;
  }
};

/**
 * Convert stream to buffer
 */
const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

// Create worker to process jobs
const worker = new Worker('upload-processing', async (job: Job) => {
  switch (job.name) {
    case 'processFile':
      await processFile(job as Job<ProcessFileJobData>);
      break;
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}, {
  connection: redis,
  concurrency: 5,
});

// Worker event handlers
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

export { worker };