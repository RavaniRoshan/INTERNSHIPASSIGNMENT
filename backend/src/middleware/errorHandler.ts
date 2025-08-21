import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { Prisma } from '@prisma/client';
import logger from '../utils/logger';

export interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error classes for different scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

// Error handler for Zod validation errors
const handleZodError = (error: ZodError): APIError => {
  const details = (error.issues || []).map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details,
    },
    timestamp: new Date().toISOString(),
  };
};

// Error handler for Prisma errors
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): APIError => {
  let message = 'Database operation failed';
  let code = 'DATABASE_ERROR';
  let statusCode = 500;

  switch (error.code) {
    case 'P2002':
      message = 'A record with this information already exists';
      code = 'DUPLICATE_RECORD';
      statusCode = 409;
      break;
    case 'P2025':
      message = 'Record not found';
      code = 'NOT_FOUND';
      statusCode = 404;
      break;
    case 'P2003':
      message = 'Foreign key constraint failed';
      code = 'FOREIGN_KEY_ERROR';
      statusCode = 400;
      break;
    case 'P2014':
      message = 'Invalid ID provided';
      code = 'INVALID_ID';
      statusCode = 400;
      break;
  }

  return {
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { details: error.meta }),
    },
    timestamp: new Date().toISOString(),
  };
};

// Main error handling middleware
export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let errorResponse: APIError;

  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });

  // Handle different types of errors
  if (err instanceof ZodError || err.name === 'ZodError') {
    statusCode = 400;
    errorResponse = handleZodError(err as ZodError);
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      timestamp: new Date().toISOString(),
    };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    statusCode = prismaError.error.code === 'NOT_FOUND' ? 404 : 
                 prismaError.error.code === 'DUPLICATE_RECORD' ? 409 : 500;
    errorResponse = prismaError;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
        ...(process.env.NODE_ENV === 'development' && { details: err.message }),
      },
      timestamp: new Date().toISOString(),
    };
  } else {
    // Generic error handling
    errorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'Something went wrong!' 
          : err.message,
        ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
      },
      timestamp: new Date().toISOString(),
    };
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: APIError = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
  };

  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json(errorResponse);
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

// Uncaught exception handler
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};