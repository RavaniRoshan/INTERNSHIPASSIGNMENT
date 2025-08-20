import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { userRegistrationSchema, userLoginSchema } from '../utils/validation';
import { APIResponse } from '../types';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = userRegistrationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validationResult.error.issues
          },
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(response);
      }

      // Register user
      const authResponse = await AuthService.register(validationResult.data);

      const response: APIResponse = {
        success: true,
        data: authResponse,
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: error instanceof Error ? error.message : 'Registration failed'
        },
        timestamp: new Date().toISOString()
      };

      // Check for specific error types
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json(response);
      }

      res.status(500).json(response);
    }
  }

  /**
   * Login a user
   */
  static async login(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = userLoginSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validationResult.error.issues
          },
          timestamp: new Date().toISOString()
        };
        return res.status(400).json(response);
      }

      // Login user
      const authResponse = await AuthService.login(validationResult.data);

      const response: APIResponse = {
        success: true,
        data: authResponse,
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: error instanceof Error ? error.message : 'Login failed'
        },
        timestamp: new Date().toISOString()
      };

      // Check for authentication errors
      if (error instanceof Error && error.message.includes('Invalid email or password')) {
        return res.status(401).json(response);
      }

      res.status(500).json(response);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
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

      const user = await AuthService.getUserById(req.user.userId);

      if (!user) {
        const response: APIResponse = {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        };
        return res.status(404).json(response);
      }

      const response: APIResponse = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile: user.profile,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      const response: APIResponse = {
        success: false,
        error: {
          code: 'PROFILE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get profile'
        },
        timestamp: new Date().toISOString()
      };

      res.status(500).json(response);
    }
  }

  /**
   * Logout user (client-side token removal)
   */
  static async logout(req: Request, res: Response) {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the token from storage. This endpoint can be used
    // for logging purposes or token blacklisting if implemented.
    
    const response: APIResponse = {
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  }
}