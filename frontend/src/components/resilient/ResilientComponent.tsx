'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorFallback, LoadingFallback, OfflineFallback } from '../fallback/FallbackUI';
import { useRetry } from '../../hooks/useRetry';
import { useOffline } from '../../hooks/useOffline';

interface ResilientComponentProps<T> {
  children: (data: T, actions: {
    refresh: () => void;
    isLoading: boolean;
    error: Error | null;
    isRetrying: boolean;
  }) => React.ReactNode;
  
  // Data fetching
  fetcher: () => Promise<T>;
  fallbackData?: T;
  
  // Retry configuration
  maxRetries?: number;
  retryDelay?: number;
  
  // Caching
  cacheKey?: string;
  maxAge?: number;
  
  // UI customization
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error, retry: () => void) => React.ReactNode;
  offlineComponent?: (retry: () => void) => React.ReactNode;
  
  // Callbacks
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
}

export function ResilientComponent<T>({
  children,
  fetcher,
  fallbackData,
  maxRetries = 3,
  retryDelay = 1000,
  cacheKey,
  maxAge = 5 * 60 * 1000, // 5 minutes
  loadingComponent,
  errorComponent,
  offlineComponent,
  onSuccess,
  onError,
  onRetry,
}: ResilientComponentProps<T>) {
  const [data, setData] = useState<T | null>(fallbackData || null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isOnline } = useOffline();
  const { retry, isRetrying, attemptCount, canRetry } = useRetry({
    maxAttempts: maxRetries,
    baseDelay: retryDelay,
    onRetry,
  });

  // Cache management
  const getCachedData = useCallback((): { data: T; timestamp: number } | null => {
    if (!cacheKey) return null;
    
    try {
      const cached = localStorage.getItem(`resilient_${cacheKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }, [cacheKey]);

  const setCachedData = useCallback((data: T) => {
    if (!cacheKey) return;
    
    try {
      localStorage.setItem(`resilient_${cacheKey}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignore storage errors
    }
  }, [cacheKey]);

  const loadData = useCallback(async (useCache = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Try cache first if offline or explicitly requested
      if ((!isOnline || useCache) && cacheKey) {
        const cached = getCachedData();
        if (cached && Date.now() - cached.timestamp < maxAge) {
          setData(cached.data);
          setIsLoading(false);
          onSuccess?.(cached.data);
          return cached.data;
        }
      }

      // Fetch fresh data with retry logic
      const result = await retry(fetcher);
      
      setData(result);
      if (cacheKey) {
        setCachedData(result);
      }
      
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);

      // Try to use cached data as fallback
      if (cacheKey) {
        const cached = getCachedData();
        if (cached) {
          setData(cached.data);
          return cached.data;
        }
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [
    isOnline,
    cacheKey,
    getCachedData,
    maxAge,
    retry,
    fetcher,
    setCachedData,
    onSuccess,
    onError,
  ]);

  const refresh = useCallback(() => {
    return loadData(false);
  }, [loadData]);

  const loadFromCache = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle online/offline transitions
  useEffect(() => {
    if (isOnline && error && canRetry) {
      // Automatically retry when coming back online
      refresh();
    }
  }, [isOnline, error, canRetry, refresh]);

  // Render loading state
  if (isLoading && !data) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return <LoadingFallback />;
  }

  // Render offline state
  if (!isOnline && !data) {
    if (offlineComponent) {
      return <>{offlineComponent(refresh)}</>;
    }
    return <OfflineFallback onRetry={refresh} />;
  }

  // Render error state
  if (error && !data) {
    if (errorComponent) {
      return <>{errorComponent(error, refresh)}</>;
    }
    return (
      <ErrorFallback
        onRetry={canRetry ? refresh : undefined}
        title={!isOnline ? "You're offline" : "Failed to load"}
        message={
          !isOnline
            ? "Check your internet connection and try again."
            : error.message || "Something went wrong while loading this content."
        }
      />
    );
  }

  // Render success state with data
  if (data) {
    return (
      <>
        {children(data, {
          refresh,
          isLoading: isLoading || isRetrying,
          error,
          isRetrying,
        })}
      </>
    );
  }

  // Fallback state
  return <ErrorFallback onRetry={refresh} />;
}

// Higher-order component version
export function withResilience<P extends object, T>(
  Component: React.ComponentType<P & { data: T; refresh: () => void; isLoading: boolean }>,
  config: Omit<ResilientComponentProps<T>, 'children'>
) {
  return function ResilientWrapper(props: P) {
    return (
      <ResilientComponent {...config}>
        {(data, actions) => (
          <Component {...props} data={data} {...actions} />
        )}
      </ResilientComponent>
    );
  };
}