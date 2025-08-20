'use client';

import React, { useEffect } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/errorReporting';

interface ErrorReportingProviderProps {
  children: React.ReactNode;
}

export function ErrorReportingProvider({ children }: ErrorReportingProviderProps) {
  useEffect(() => {
    // Set up global error handlers when the app starts
    setupGlobalErrorHandlers();
  }, []);

  return <>{children}</>;
}