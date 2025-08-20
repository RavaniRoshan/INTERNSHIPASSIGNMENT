'use client';

import { useState, useCallback, useRef } from 'react';

interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number) => void;
  onMaxAttemptsReached?: () => void;
}

interface RetryState {
  isRetrying: boolean;
  attemptCount: number;
  canRetry: boolean;
  nextRetryIn: number;
}

export function useRetry(config: RetryConfig = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry,
    onMaxAttemptsReached,
  } = config;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    canRetry: true,
    nextRetryIn: 0,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }, [baseDelay, backoffFactor, maxDelay]);

  const startCountdown = useCallback((delay: number) => {
    setState(prev => ({ ...prev, nextRetryIn: Math.ceil(delay / 1000) }));
    
    const countdown = setInterval(() => {
      setState(prev => {
        const newTime = prev.nextRetryIn - 1;
        if (newTime <= 0) {
          clearInterval(countdown);
          return { ...prev, nextRetryIn: 0 };
        }
        return { ...prev, nextRetryIn: newTime };
      });
    }, 1000);

    countdownRef.current = countdown;
  }, []);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    shouldRetry?: (error: any) => boolean
  ): Promise<T> => {
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setState({
      isRetrying: false,
      attemptCount: 0,
      canRetry: true,
      nextRetryIn: 0,
    });

    const executeAttempt = async (attempt: number): Promise<T> => {
      try {
        setState(prev => ({ 
          ...prev, 
          isRetrying: attempt > 0, 
          attemptCount: attempt + 1 
        }));

        const result = await operation();
        
        // Success - reset state
        setState({
          isRetrying: false,
          attemptCount: attempt + 1,
          canRetry: true,
          nextRetryIn: 0,
        });

        return result;
      } catch (error) {
        const isLastAttempt = attempt >= maxAttempts - 1;
        const shouldRetryError = shouldRetry ? shouldRetry(error) : true;

        if (isLastAttempt || !shouldRetryError) {
          setState(prev => ({ 
            ...prev, 
            isRetrying: false, 
            canRetry: false 
          }));

          if (isLastAttempt && onMaxAttemptsReached) {
            onMaxAttemptsReached();
          }

          throw error;
        }

        // Calculate delay for next attempt
        const delay = calculateDelay(attempt);
        
        setState(prev => ({ 
          ...prev, 
          isRetrying: true,
          canRetry: true
        }));

        if (onRetry) {
          onRetry(attempt + 1);
        }

        // Start countdown
        startCountdown(delay);

        // Wait before next attempt
        await new Promise(resolve => {
          timeoutRef.current = setTimeout(resolve, delay);
        });

        return executeAttempt(attempt + 1);
      }
    };

    return executeAttempt(0);
  }, [maxAttempts, calculateDelay, onRetry, onMaxAttemptsReached, startCountdown]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setState({
      isRetrying: false,
      attemptCount: 0,
      canRetry: true,
      nextRetryIn: 0,
    });
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  return {
    retry,
    reset,
    ...state,
  };
}

// Hook for retrying API calls with exponential backoff
export function useApiRetry(config: RetryConfig = {}) {
  const retryHook = useRetry({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    ...config,
  });

  const retryApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T> => {
    return retryHook.retry(apiCall, (error) => {
      // Only retry on network errors or 5xx server errors
      if (error?.response?.status) {
        return error.response.status >= 500;
      }
      // Retry on network errors (no response)
      return !error?.response;
    });
  }, [retryHook]);

  return {
    ...retryHook,
    retryApiCall,
  };
}