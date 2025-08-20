'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface FallbackUIProps {
  type: 'error' | 'loading' | 'offline' | 'empty';
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  children?: React.ReactNode;
}

export function FallbackUI({
  type,
  title,
  message,
  onRetry,
  showRetry = true,
  children,
}: FallbackUIProps) {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      case 'loading':
        return <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-12 w-12 text-gray-500" />;
      case 'empty':
        return <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-xl">📭</span>
        </div>;
      default:
        return <AlertCircle className="h-12 w-12 text-gray-500" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'error':
        return 'Something went wrong';
      case 'loading':
        return 'Loading...';
      case 'offline':
        return 'You\'re offline';
      case 'empty':
        return 'No data available';
      default:
        return 'Unexpected state';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'error':
        return 'We encountered an error while loading this content. Please try again.';
      case 'loading':
        return 'Please wait while we load your content.';
      case 'offline':
        return 'Check your internet connection and try again.';
      case 'empty':
        return 'There\'s nothing to show here yet.';
      default:
        return 'An unexpected state occurred.';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      case 'offline':
        return 'bg-gray-50 border-gray-200';
      case 'empty':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 rounded-lg border ${getBackgroundColor()}`}>
      <div className="flex justify-center mb-4">
        {getIcon()}
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
        {title || getDefaultTitle()}
      </h3>
      
      <p className="text-gray-600 text-center mb-6 max-w-md">
        {message || getDefaultMessage()}
      </p>

      {children && (
        <div className="mb-4">
          {children}
        </div>
      )}

      {showRetry && onRetry && type !== 'loading' && (
        <button
          onClick={onRetry}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
}

// Specific fallback components for common use cases
export function ErrorFallback({ 
  onRetry, 
  title = "Failed to load", 
  message = "Something went wrong while loading this content." 
}: { 
  onRetry?: () => void; 
  title?: string; 
  message?: string; 
}) {
  return (
    <FallbackUI
      type="error"
      title={title}
      message={message}
      onRetry={onRetry}
    />
  );
}

export function LoadingFallback({ 
  title = "Loading...", 
  message = "Please wait while we load your content." 
}: { 
  title?: string; 
  message?: string; 
}) {
  return (
    <FallbackUI
      type="loading"
      title={title}
      message={message}
      showRetry={false}
    />
  );
}

export function OfflineFallback({ 
  onRetry, 
  title = "You're offline", 
  message = "Check your internet connection and try again." 
}: { 
  onRetry?: () => void; 
  title?: string; 
  message?: string; 
}) {
  return (
    <FallbackUI
      type="offline"
      title={title}
      message={message}
      onRetry={onRetry}
    />
  );
}

export function EmptyFallback({ 
  title = "No data available", 
  message = "There's nothing to show here yet.",
  children
}: { 
  title?: string; 
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <FallbackUI
      type="empty"
      title={title}
      message={message}
      showRetry={false}
    >
      {children}
    </FallbackUI>
  );
}