'use client';

import { useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export function useEngagementTracking() {
  const { user } = useAuth();

  const trackEngagement = useCallback(async (
    action: 'VIEW' | 'LIKE' | 'FOLLOW' | 'SHARE',
    projectId: string,
    referrer?: string
  ) => {
    if (!user || !projectId) return;

    try {
      // Set session ID header
      const sessionId = getSessionId();
      
      await api.post('/users/engagement', {
        projectId,
        action,
        referrer: referrer || document.referrer || undefined,
      }, {
        headers: {
          'x-session-id': sessionId,
        },
      });
    } catch (error) {
      console.error('Failed to track engagement:', error);
      // Don't throw error as tracking shouldn't break user experience
    }
  }, [user]);

  const trackProjectView = useCallback((projectId: string) => {
    trackEngagement('VIEW', projectId);
  }, [trackEngagement]);

  const trackProjectLike = useCallback((projectId: string) => {
    trackEngagement('LIKE', projectId);
  }, [trackEngagement]);

  const trackUserFollow = useCallback((projectId: string) => {
    trackEngagement('FOLLOW', projectId);
  }, [trackEngagement]);

  const trackProjectShare = useCallback((projectId: string) => {
    trackEngagement('SHARE', projectId);
  }, [trackEngagement]);

  return {
    trackProjectView,
    trackProjectLike,
    trackUserFollow,
    trackProjectShare,
    trackEngagement
  };
}

function getSessionId(): string {
  if (typeof window === 'undefined') return `session_${Date.now()}`;
  
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}