'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEngagementTracking } from '@/hooks/useEngagementTracking';

interface ProjectViewTrackerProps {
  projectId: string;
  creatorId: string;
}

export function ProjectViewTracker({ projectId, creatorId }: ProjectViewTrackerProps) {
  const { user } = useAuth();
  const { trackProjectView } = useEngagementTracking();

  useEffect(() => {
    // Track project view if user is authenticated and not the creator
    if (user && user.id !== creatorId) {
      trackProjectView(projectId);
    }
  }, [user, projectId, creatorId, trackProjectView]);

  // This component doesn't render anything
  return null;
}