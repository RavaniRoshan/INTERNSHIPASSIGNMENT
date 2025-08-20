import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authenticateToken, requireCreator } from '../middleware/auth';
import { cacheProjects, invalidateCache } from '../middleware/cache';

const router = Router();

// Public routes - with caching
router.get('/published', cacheProjects, projectController.getPublishedProjects);
router.get('/:id', authenticateToken, cacheProjects, projectController.getProject);

// Protected routes - require authentication and invalidate cache
router.post('/', 
  authenticateToken, 
  requireCreator, 
  invalidateCache(['projects:*']), 
  projectController.createProject
);
router.put('/:id', 
  authenticateToken, 
  requireCreator, 
  invalidateCache(['projects:*']), 
  projectController.updateProject
);
router.delete('/:id', 
  authenticateToken, 
  requireCreator, 
  invalidateCache(['projects:*']), 
  projectController.deleteProject
);

// Creator-specific routes
router.get('/creator/my-projects', authenticateToken, requireCreator, projectController.getCreatorProjects);

export default router;