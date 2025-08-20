import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { uploadRateLimitMiddleware } from '../middleware/rateLimiter';
import { validateRequest, fileUploadSchema, idParamSchema } from '../utils/validation';
import {
  generatePresignedUrl,
  completeUpload,
  getUploadStatus,
  deleteUpload,
} from '../controllers/uploadController';

const router = Router();

// All upload routes require authentication
router.use(authenticateToken);
router.use(uploadRateLimitMiddleware);

// Generate presigned URL for file upload
router.post('/presigned-url', 
  validateRequest(fileUploadSchema),
  generatePresignedUrl
);

// Complete file upload and store metadata
router.post('/complete', completeUpload);

// Get upload status
router.get('/status/:fileId', 
  validateRequest(idParamSchema, 'params'),
  getUploadStatus
);

// Delete uploaded file
router.delete('/:fileId', 
  validateRequest(idParamSchema, 'params'),
  deleteUpload
);

export default router;