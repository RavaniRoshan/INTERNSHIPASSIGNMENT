import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database';
import { EventTracker } from '../utils/eventTracker';
import { integrationService } from '../services/integrationService';

// Validation schemas
const followUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});

const getUserProfileSchema = z.object({
  userId: z.string().min(1, 'User ID is required')
});

/**
 * Follow a user
 * POST /users/:userId/follow
 */
export const followUser = async (req: Request, res: Response) => {
  try {
    const { userId } = followUserSchema.parse(req.params);
    const followerId = req.user?.userId;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Prevent self-following
    if (followerId === userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot follow yourself'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_FOLLOWING',
          message: 'Already following this user'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: userId
      }
    });

    // Track follow event
    await EventTracker.trackFollow(req, userId, followerId);
    
    // Track engagement through integration service
    const sessionId = req.headers['x-session-id'] as string || `session_${Date.now()}`;
    const referrer = req.headers.referer;
    
    await integrationService.handleUserEngagement(
      followerId,
      '', // No specific project for follow action
      'FOLLOW',
      sessionId,
      referrer
    );

    res.status(201).json({
      success: true,
      data: {
        id: follow.id,
        followerId: follow.followerId,
        followingId: follow.followingId,
        createdAt: follow.createdAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error following user:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to follow user'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Unfollow a user
 * DELETE /users/:userId/follow
 */
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { userId } = followUserSchema.parse(req.params);
    const followerId = req.user?.userId;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Find and delete follow relationship
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: userId
        }
      }
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOLLOWING',
          message: 'Not following this user'
        },
        timestamp: new Date().toISOString()
      });
    }

    await prisma.follow.delete({
      where: {
        id: follow.id
      }
    });

    res.json({
      success: true,
      data: {
        message: 'Successfully unfollowed user'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to unfollow user'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get user profile with follow status
 * GET /users/:userId
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = getUserProfileSchema.parse(req.params);
    const currentUserId = req.user?.userId;

    // Get user with project count and follower/following counts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        profile: true,
        createdAt: true,
        _count: {
          select: {
            projects: {
              where: { isPublished: true }
            },
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const followRelation = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId
          }
        }
      });
      isFollowing = !!followRelation;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
        stats: {
          projectCount: user._count.projects,
          followerCount: user._count.followers,
          followingCount: user._count.following
        },
        isFollowing
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user profile'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get user's followers
 * GET /users/:userId/followers
 */
export const getUserFollowers = async (req: Request, res: Response) => {
  try {
    const { userId } = getUserProfileSchema.parse(req.params);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get followers with pagination
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true,
            _count: {
              select: {
                projects: {
                  where: { isPublished: true }
                },
                followers: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.follow.count({
      where: { followingId: userId }
    });

    res.json({
      success: true,
      data: {
        followers: followers.map(f => ({
          id: f.follower.id,
          email: f.follower.email,
          role: f.follower.role,
          profile: f.follower.profile,
          stats: {
            projectCount: f.follower._count.projects,
            followerCount: f.follower._count.followers
          },
          followedAt: f.createdAt
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user followers:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user followers'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Track user engagement (like, share, etc.)
 * POST /users/engagement
 */
export const trackEngagement = async (req: Request, res: Response) => {
  try {
    const engagementSchema = z.object({
      projectId: z.string().min(1, 'Project ID is required'),
      action: z.enum(['LIKE', 'SHARE', 'VIEW', 'FOLLOW']),
      referrer: z.string().optional()
    });

    const { projectId, action, referrer } = engagementSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const sessionId = req.headers['x-session-id'] as string || `session_${Date.now()}`;
    
    await integrationService.handleUserEngagement(
      userId,
      projectId,
      action,
      sessionId,
      referrer
    );

    res.json({
      success: true,
      data: {
        message: 'Engagement tracked successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to track engagement'
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get user's following
 * GET /users/:userId/following
 */
export const getUserFollowing = async (req: Request, res: Response) => {
  try {
    const { userId } = getUserProfileSchema.parse(req.params);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get following with pagination
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: true,
            _count: {
              select: {
                projects: {
                  where: { isPublished: true }
                },
                followers: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.follow.count({
      where: { followerId: userId }
    });

    res.json({
      success: true,
      data: {
        following: following.map(f => ({
          id: f.following.id,
          email: f.following.email,
          role: f.following.role,
          profile: f.following.profile,
          stats: {
            projectCount: f.following._count.projects,
            followerCount: f.following._count.followers
          },
          followedAt: f.createdAt
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting user following:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user following'
      },
      timestamp: new Date().toISOString()
    });
  }
};