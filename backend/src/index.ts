import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Import logging and error handling
import logger, { morganStream } from './utils/logger';
import { 
  globalErrorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} from './middleware/errorHandler';

// Import security middleware
import { corsOptions, helmetConfig, sanitizeInput, securityHeaders, securityLogger, requestSizeLimit } from './middleware/security';
import { generalRateLimitMiddleware } from './middleware/rateLimiter';
import cors from 'cors';

// Set up global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware (order matters)
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(securityHeaders);
app.use(securityLogger);
app.use(generalRateLimitMiddleware);
app.use(morgan('combined', { stream: morganStream }));
app.use(requestSizeLimit('10mb'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  };
  
  logger.info('Health check requested', { ip: req.ip });
  res.json(healthData);
});

// Import routes
import apiRoutes from './routes';
import errorRoutes from './routes/errorRoutes';
import healthRoutes from './routes/healthRoutes';

// Import system initialization
import { systemInitService } from './services/systemInitService';

// Health routes (before API routes for better performance)
app.use('/health', healthRoutes);

// API routes
app.use('/api', apiRoutes);
app.use('/api/errors', errorRoutes);

// 404 handler (must be before error handler)
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Export app for testing
export { app };

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Initialize system components before starting server
  systemInitService.initialize()
    .then(() => {
      app.listen(PORT, () => {
        logger.info('Server started successfully', {
          port: PORT,
          environment: process.env.NODE_ENV,
          nodeVersion: process.version,
          timestamp: new Date().toISOString(),
        });
        
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 Logs directory: ${path.join(process.cwd(), 'logs')}`);
      });
    })
    .catch((error) => {
      logger.error('Failed to initialize system', { error });
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, starting graceful shutdown');
    try {
      await systemInitService.shutdown();
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, starting graceful shutdown');
    try {
      await systemInitService.shutdown();
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  });
}