import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/auth';
import { JWTPayload, APIResponse } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    const response: APIResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is required'
      },
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(response);
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Token verification failed'
      },
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(response);
  }
}

/**
 * Middleware to authorize specific roles
 */
export function authorizeRoles(...roles: ('CREATOR' | 'VIEWER')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(401).json(response);
    }

    if (!roles.includes(req.user.role)) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required roles: ${roles.join(', ')}`
        },
        timestamp: new Date().toISOString()
      };
      return res.status(403).json(response);
    }

    next();
  };
}

/**
 * Middleware to authorize creators only
 */
export const authorizeCreator = authorizeRoles('CREATOR');

/**
 * Alias for authorizeCreator for consistency
 */
export const requireCreator = authorizeCreator;

/**
 * Middleware to authorize viewers and creators
 */
export const authorizeUser = authorizeRoles('CREATOR', 'VIEWER');

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    // No token provided, continue without user
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch (error) {
    // Invalid token, but don't fail - just continue without user
    console.warn('Invalid token provided in optional auth:', error);
  }

  next();
}