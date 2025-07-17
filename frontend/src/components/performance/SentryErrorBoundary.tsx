/**
 * Sentry-Enhanced Error Boundary Component
 * 
 * Provides comprehensive error catching with Sentry integration,
 * user-friendly error display, and error recovery options.
 */

import React, { Component, ReactNode } from 'react';
import { ErrorSeverity, ErrorCategory, formatErrorForDisplay, createApplicationError } from '@/lib/error-handler';

interface SentryErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
  level?: 'page' | 'component' | 'widget';
}

interface SentryErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  eventId: string | null;
  retryCount: number;
}

/**
 * Enhanced Error Boundary with Sentry Integration
 * 
 * Features:
 * - Automatic error reporting to Sentry
 * - User-friendly error UI with recovery options
 * - Error isolation to prevent cascade failures
 * - Retry mechanisms with exponential backoff
 * - Development vs production error display
 * - Error context preservation
 */
export class SentryErrorBoundary extends Component<SentryErrorBoundaryProps, SentryErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private retryTimeouts: number[] = [];

  constructor(props: SentryErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      eventId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SentryErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.handleError(error, errorInfo);
  }

  componentDidUpdate(prevProps: SentryErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state when props change (if enabled)
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== (prevProps.resetKeys?.[index])
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    // Clean up timeouts
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
    this.retryTimeouts.forEach(id => window.clearTimeout(id));
  }

  private async handleError(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;

    try {
      // Create application error with context
      const appError = createApplicationError(error, {
        additionalData: {
          componentStack: errorInfo.componentStack,
          errorBoundary: this.props.level || 'component',
          retryCount: this.state.retryCount,
        }
      });

      // Report to Sentry
      const eventId = await this.reportToSentry(error, errorInfo, appError);
      
      this.setState({
        errorId: appError.id,
        eventId: eventId || null,
      });

      // Call custom error handler if provided
      onError?.(error, errorInfo);

      // Log for development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Error Boundary Caught Error');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Application Error:', appError);
        console.groupEnd();
      }

    } catch (reportingError) {
      console.error('Failed to report error to Sentry:', reportingError);
    }
  }

  private async reportToSentry(
    error: Error, 
    errorInfo: React.ErrorInfo,
    appError: ReturnType<typeof createApplicationError>
  ): Promise<string | null> {
    try {
      // Dynamic import to handle optional dependency
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (!Sentry) return null;

      return Sentry.withScope(scope => {
        // Set error boundary context
        scope.setTag('errorBoundary', this.props.level || 'component');
        scope.setTag('errorCategory', appError.category);
        scope.setTag('errorSeverity', appError.severity);
        scope.setLevel(this.mapSeverityToSentryLevel(appError.severity));
        
        // Add component stack and additional context
        scope.setContext('errorInfo', {
          componentStack: errorInfo.componentStack,
          retryCount: this.state.retryCount,
          errorId: appError.id,
        });

        // Set fingerprint for better grouping
        scope.setFingerprint([
          'error-boundary',
          this.props.level || 'component',
          error.name,
          error.message,
        ]);

        // Add user context if available
        if (typeof window !== 'undefined') {
          scope.setContext('browser', {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          });
        }

        return Sentry.captureException(error);
      });
    } catch (sentryError) {
      console.error('Sentry reporting failed:', sentryError);
      return null;
    }
  }

  private mapSeverityToSentryLevel(severity: ErrorSeverity): 'error' | 'warning' | 'info' | 'fatal' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  private resetErrorBoundary = () => {
    // Clear any pending timeouts
    this.retryTimeouts.forEach(id => window.clearTimeout(id));
    this.retryTimeouts = [];

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      eventId: null,
      retryCount: 0,
    });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000;
      
      const timeoutId = window.setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          retryCount: prevState.retryCount + 1,
        }));
      }, delay);
      
      this.retryTimeouts.push(timeoutId);
    }
  };

  private handleFeedback = async () => {
    const { eventId } = this.state;
    
    try {
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry && eventId) {
        Sentry.showReportDialog({ eventId });
      } else {
        // Fallback: open feedback form
        window.open(
          'mailto:support@opssight.com?subject=Error Report&body=I encountered an error on the platform.',
          '_blank'
        );
      }
    } catch (error) {
      console.error('Failed to open feedback dialog:', error);
    }
  };

  private renderErrorFallback() {
    const { fallback, level = 'component' } = this.props;
    const { error, errorId, retryCount } = this.state;

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    if (!error) return null;

    const isProduction = process.env.NODE_ENV === 'production';
    const maxRetries = 3;
    const canRetry = retryCount < maxRetries;

    return (
      <div className="flex items-center justify-center min-h-[200px] p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Error Icon */}
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Error Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {level === 'page' ? 'Page Error' : 'Something went wrong'}
            </h3>

            {/* Error Message */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isProduction 
                ? "We're sorry, but something unexpected happened. Our team has been notified."
                : error.message
              }
            </p>

            {/* Error Details (Development only) */}
            {!isProduction && (
              <details className="text-left mb-6">
                <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer mb-2">
                  Technical Details
                </summary>
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm">
                  <p><strong>Error:</strong> {error.name}</p>
                  <p><strong>Message:</strong> {error.message}</p>
                  {errorId && <p><strong>ID:</strong> {errorId}</p>}
                  {retryCount > 0 && <p><strong>Retry Count:</strong> {retryCount}</p>}
                  {error.stack && (
                    <div className="mt-2">
                      <strong>Stack:</strong>
                      <pre className="text-xs overflow-auto mt-1">{error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Try Again {retryCount > 0 && `(${maxRetries - retryCount} left)`}
                </button>
              )}
              
              <button
                onClick={this.resetErrorBoundary}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                Reset
              </button>
              
              <button
                onClick={this.handleFeedback}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Report Issue
              </button>
            </div>

            {/* Error ID for Support */}
            {errorId && isProduction && (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Error ID: {errorId}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withSentryErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps: Omit<SentryErrorBoundaryProps, 'children'> = {}
) {
  const WithErrorBoundary = (props: P) => (
    <SentryErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </SentryErrorBoundary>
  );

  WithErrorBoundary.displayName = `withSentryErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
}

// Hook for manual error reporting
export function useSentryErrorReporting() {
  const reportError = async (error: Error, context?: Record<string, any>) => {
    try {
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry) {
        Sentry.withScope(scope => {
          if (context) {
            scope.setContext('additional', context);
          }
          scope.setTag('reportedManually', true);
          Sentry.captureException(error);
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  const reportMessage = async (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
    try {
      const Sentry = await import('@sentry/nextjs').catch(() => null);
      if (Sentry) {
        Sentry.withScope(scope => {
          scope.setLevel(level);
          if (context) {
            scope.setContext('additional', context);
          }
          scope.setTag('reportedManually', true);
          Sentry.captureMessage(message);
        });
      }
    } catch (reportingError) {
      console.error('Failed to report message:', reportingError);
    }
  };

  return { reportError, reportMessage };
}

export default SentryErrorBoundary;