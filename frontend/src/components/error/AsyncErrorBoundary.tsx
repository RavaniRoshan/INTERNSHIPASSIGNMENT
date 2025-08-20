'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default async error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
          
          <h3 className="text-lg font-medium text-red-900 mb-2">
            Failed to load content
          </h3>
          
          <p className="text-red-700 text-center mb-4 max-w-md">
            {this.state.error.message || 'An unexpected error occurred while loading this content.'}
          </p>

          {this.state.retryCount < this.maxRetries && (
            <button
              onClick={this.handleRetry}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry ({this.maxRetries - this.state.retryCount} attempts left)
            </button>
          )}

          {this.state.retryCount >= this.maxRetries && (
            <p className="text-sm text-red-600">
              Maximum retry attempts reached. Please refresh the page.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling async errors in functional components
export const useAsyncError = () => {
  const [, setError] = React.useState();
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
};