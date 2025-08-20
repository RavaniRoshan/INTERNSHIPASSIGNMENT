import { Router } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Error report schema
const errorReportSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  timestamp: z.string(),
  userAgent: z.string(),
  url: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  additionalContext: z.record(z.any()).optional(),
});

// POST /api/errors - Report client-side errors
router.post('/', asyncHandler(async (req, res) => {
  const errorReport = errorReportSchema.parse(req.body);

  // Log the client-side error
  logger.error('Client-side error reported:', {
    ...errorReport,
    ip: req.ip,
    reportedAt: new Date().toISOString(),
  });

  // In a production environment, you might want to:
  // 1. Store errors in a database for analysis
  // 2. Send to external error monitoring services (Sentry, LogRocket, etc.)
  // 3. Alert on critical errors
  // 4. Aggregate similar errors

  res.json({
    success: true,
    message: 'Error report received',
    timestamp: new Date().toISOString(),
  });
}));

// GET /api/errors/health - Health check for error reporting
router.get('/health', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    service: 'error-reporting',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}));

export default router;