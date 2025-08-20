interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  additionalContext?: Record<string, any>;
}

interface ErrorReportingConfig {
  enabled: boolean;
  endpoint: string;
  maxRetries: number;
  retryDelay: number;
}

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private queue: ErrorReport[] = [];
  private isProcessing = false;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      endpoint: '/api/errors',
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  public reportError(
    error: Error,
    additionalContext?: Record<string, any>
  ): void {
    if (!this.config.enabled) {
      console.error('Error (reporting disabled):', error, additionalContext);
      return;
    }

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      additionalContext,
    };

    this.queue.push(errorReport);
    this.processQueue();
  }

  public reportComponentError(
    error: Error,
    componentStack: string,
    additionalContext?: Record<string, any>
  ): void {
    if (!this.config.enabled) {
      console.error('Component Error (reporting disabled):', error, componentStack, additionalContext);
      return;
    }

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      additionalContext,
    };

    this.queue.push(errorReport);
    this.processQueue();
  }

  public reportCustomError(
    message: string,
    additionalContext?: Record<string, any>
  ): void {
    if (!this.config.enabled) {
      console.error('Custom Error (reporting disabled):', message, additionalContext);
      return;
    }

    const errorReport: ErrorReport = {
      message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      additionalContext,
    };

    this.queue.push(errorReport);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const errorReport = this.queue.shift()!;
      await this.sendErrorReport(errorReport);
    }

    this.isProcessing = false;
  }

  private async sendErrorReport(
    errorReport: ErrorReport,
    retryCount = 0
  ): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send error report:', error);

      // Retry logic
      if (retryCount < this.config.maxRetries) {
        setTimeout(() => {
          this.sendErrorReport(errorReport, retryCount + 1);
        }, this.config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      } else {
        console.error('Max retries reached for error report:', errorReport);
      }
    }
  }

  private getUserId(): string | undefined {
    // Try to get user ID from localStorage or context
    try {
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.user?.id;
      }
    } catch (error) {
      // Ignore errors when getting user ID
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    // Try to get session ID from sessionStorage
    try {
      let sessionId = sessionStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = this.generateSessionId();
        sessionStorage.setItem('sessionId', sessionId);
      }
      return sessionId;
    } catch (error) {
      // Ignore errors when getting session ID
    }
    return undefined;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  public configure(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public enable(): void {
    this.config.enabled = true;
  }

  public disable(): void {
    this.config.enabled = false;
  }
}

// Global error reporting instance
export const errorReporting = new ErrorReportingService();

// Global error handlers
export const setupGlobalErrorHandlers = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorReporting.reportError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      {
        type: 'unhandledrejection',
        reason: event.reason,
      }
    );
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    errorReporting.reportError(
      new Error(event.message),
      {
        type: 'uncaughtError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const target = event.target as HTMLElement;
      errorReporting.reportCustomError(
        `Resource loading failed: ${target.tagName}`,
        {
          type: 'resourceError',
          tagName: target.tagName,
          src: (target as any).src || (target as any).href,
        }
      );
    }
  }, true);
};

export default errorReporting;