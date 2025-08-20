import { Router } from 'express';
import { searchController } from '../controllers/searchController';
import { authenticateToken, requireCreator } from '../middleware/auth';
import { searchRateLimitMiddleware } from '../middleware/rateLimiter';
import { validateRequest, searchQuerySchema } from '../utils/validation';
import { cacheSearch } from '../middleware/cache';

const router = Router();

/**
 * @route GET /search
 * @desc Search for projects
 * @access Public
 * @query {string} [query] - Search query
 * @query {string[]} [tags] - Filter by tags
 * @query {string[]} [techStack] - Filter by tech stack
 * @query {string} [sortBy] - Sort by: relevance, date, popularity
 * @query {number} [page=1] - Page number
 * @query {number} [limit=20] - Results per page
 */
router.get('/', 
  searchRateLimitMiddleware,
  validateRequest(searchQuerySchema, 'query'),
  cacheSearch,
  searchController.search.bind(searchController)
);

/**
 * @route GET /search/suggestions
 * @desc Get search suggestions
 * @access Public
 * @query {string} query - Search query (required)
 * @query {number} [limit=5] - Number of suggestions
 */
router.get('/suggestions', 
  searchRateLimitMiddleware,
  cacheSearch,
  searchController.getSuggestions.bind(searchController)
);

/**
 * @route GET /search/stats
 * @desc Get search index statistics
 * @access Public
 */
router.get('/stats', searchController.getStats.bind(searchController));

/**
 * @route POST /search/reindex
 * @desc Reindex all projects (creator only)
 * @access Private (Creator)
 */
router.post('/reindex', 
  authenticateToken, 
  requireCreator, 
  searchController.reindexProjects.bind(searchController)
);

export default router;