'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfflineConfig {
  checkInterval?: number;
  pingUrl?: string;
  timeout?: number;
  onOnline?: () => void;
  onOffline?: () => void;
}

interface OfflineState {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
}

export function useOffline(config: OfflineConfig = {}) {
  const {
    checkInterval = 30000, // 30 seconds
    pingUrl = '/api/health',
    timeout = 5000,
    onOnline,
    onOffline,
  } = config;

  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isChecking: false,
    lastChecked: null,
  });

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const isOnline = response.ok;
      
      setState(prev => ({
        ...prev,
        isOnline,
        isChecking: false,
        lastChecked: new Date(),
      }));

      return isOnline;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isOnline: false,
        isChecking: false,
        lastChecked: new Date(),
      }));

      return false;
    }
  }, [pingUrl, timeout]);

  const handleOnline = useCallback(() => {
    setState(prev => {
      if (!prev.isOnline) {
        onOnline?.();
        return { ...prev, isOnline: true, lastChecked: new Date() };
      }
      return prev;
    });
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    setState(prev => {
      if (prev.isOnline) {
        onOffline?.();
        return { ...prev, isOnline: false, lastChecked: new Date() };
      }
      return prev;
    });
  }, [onOffline]);

  useEffect(() => {
    // Initial connectivity check
    checkConnectivity();

    // Set up event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic connectivity checks
    const intervalId = setInterval(checkConnectivity, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkConnectivity, handleOnline, handleOffline, checkInterval]);

  return {
    ...state,
    checkConnectivity,
  };
}

// Hook for handling offline-first data with local storage fallback
export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: OfflineConfig & { 
    fallbackData?: T;
    maxAge?: number; // in milliseconds
  } = {}
) {
  const { fallbackData, maxAge = 5 * 60 * 1000 } = config; // 5 minutes default
  const offline = useOffline(config);
  
  const [data, setData] = useState<T | null>(fallbackData || null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCachedData = useCallback((): { data: T; timestamp: number } | null => {
    try {
      const cached = localStorage.getItem(`offline_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, [key]);

  const setCachedData = useCallback((data: T) => {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore storage errors
    }
  }, [key]);

  const fetchData = useCallback(async (useCache = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // If offline or explicitly using cache, try cached data first
      if (!offline.isOnline || useCache) {
        const cached = getCachedData();
        if (cached && Date.now() - cached.timestamp < maxAge) {
          setData(cached.data);
          setIsLoading(false);
          return cached.data;
        }
      }

      // If online, fetch fresh data
      if (offline.isOnline) {
        const freshData = await fetcher();
        setData(freshData);
        setCachedData(freshData);
        setIsLoading(false);
        return freshData;
      }

      // If offline and no valid cache, use fallback or throw error
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setIsLoading(false);
        return cached.data;
      }

      throw new Error('No data available offline');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // Try to use cached data as fallback
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
      } else if (fallbackData) {
        setData(fallbackData);
      }
      
      setIsLoading(false);
      throw error;
    }
  }, [offline.isOnline, fetcher, getCachedData, setCachedData, maxAge, fallbackData]);

  const refresh = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  const loadFromCache = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    isOnline: offline.isOnline,
    refresh,
    loadFromCache,
  };
}