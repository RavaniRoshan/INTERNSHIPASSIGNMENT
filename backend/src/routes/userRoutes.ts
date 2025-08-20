import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import {
  followUser,
  unfollowUser,
  getUserProfile,
  getUserFollowers,
  getUserFollowing,
  trackEngagement
} from '../controllers/userController';

const router = Router();

/**
 * @route   GET /users/:userId
 * @desc    Get user profile with follow status
 * @access  Public (optional auth for follow status)
 */
router.get('/:userId', optionalAuth, getUserProfile);

/**
 * @route   POST /users/:userId/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post('/:userId/follow', authenticateToken, followUser);

/**
 * @route   DELETE /users/:userId/follow
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete('/:userId/follow', authenticateToken, unfollowUser);

/**
 * @route   GET /users/:userId/followers
 * @desc    Get user's followers
 * @access  Public
 */
router.get('/:userId/followers', getUserFollowers);

/**
 * @route   GET /users/:userId/following
 * @desc    Get users that this user follows
 * @access  Public
 */
router.get('/:userId/following', getUserFollowing);

/**
 * @route   POST /users/engagement
 * @desc    Track user engagement (like, share, etc.)
 * @access  Private
 */
router.post('/engagement', authenticateToken, trackEngagement);

export default router;