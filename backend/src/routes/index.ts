import { Router } from 'express';
import authRoutes from './auth';
import projectRoutes from './projectRoutes';
import uploadRoutes from './upload';
import searchRoutes from './searchRoutes';
import recommendationRoutes from './recommendationRoutes';
import analyticsRoutes from './analyticsRoutes';
import userRoutes from './userRoutes';
import maintenanceRoutes from './maintenanceRoutes';

const router = Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount project routes
router.use('/projects', projectRoutes);

// Mount upload routes
router.use('/upload', uploadRoutes);

// Mount search routes
router.use('/search', searchRoutes);

// Mount recommendation routes
router.use('/recommendations', recommendationRoutes);

// Mount analytics routes
router.use('/analytics', analyticsRoutes);

// Mount user routes
router.use('/users', userRoutes);

// Mount maintenance routes
router.use('/maintenance', maintenanceRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Creator Portfolio Hub API'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;