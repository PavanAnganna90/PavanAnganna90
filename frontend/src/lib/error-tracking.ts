import * as Sentry from '@sentry/nextjs';
import { recordError } from './metrics';

export interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export class ErrorTracker {
  /**
   * Track an error with context
   */
  static trackError(error: Error, context?: ErrorContext) {
    // Record metric
    recordError(error.name, context?.component || 'unknown');
    
    // Send to Sentry with context
    Sentry.withScope((scope) => {
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context?.component) {
        scope.setTag('component', context.component);
      }
      
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      
      if (context?.metadata) {
        Object.entries(context.metadata).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      
      Sentry.captureException(error);
    });
  }

  /**
   * Track a warning or info message
   */
  static trackMessage(message: string, level: 'warning' | 'info' | 'error' = 'info', context?: ErrorContext) {
    Sentry.withScope((scope) => {
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context?.component) {
        scope.setTag('component', context.component);
      }
      
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      
      if (context?.metadata) {
        Object.entries(context.metadata).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      
      scope.setLevel(level);
      Sentry.captureMessage(message);
    });
  }

  /**
   * Set user context for all subsequent errors
   */
  static setUserContext(user: { id: string; email?: string; username?: string; role?: string }) {
    Sentry.setUser(user);
  }

  /**
   * Add breadcrumb for debugging
   */
  static addBreadcrumb(message: string, category = 'action', level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Track performance issues
   */
  static trackPerformance(name: string, duration: number, metadata?: Record<string, any>) {
    if (duration > 3000) { // Track slow operations (>3s)
      this.trackMessage(
        `Slow operation detected: ${name}`,
        'warning',
        {
          component: 'performance',
          action: name,
          metadata: {
            duration: `${duration}ms`,
            ...metadata
          }
        }
      );
    }
  }

  /**
   * Track API errors
   */
  static trackApiError(endpoint: string, status: number, error: string, metadata?: Record<string, any>) {
    this.trackMessage(
      `API Error: ${endpoint}`,
      status >= 500 ? 'error' : 'warning',
      {
        component: 'api',
        action: 'request',
        metadata: {
          endpoint,
          status,
          error,
          ...metadata
        }
      }
    );
  }

  /**
   * Track authentication errors
   */
  static trackAuthError(type: 'login' | 'logout' | 'token_refresh' | 'permission_denied', error: string, metadata?: Record<string, any>) {
    this.trackMessage(
      `Authentication Error: ${type}`,
      'warning',
      {
        component: 'auth',
        action: type,
        metadata: {
          error,
          ...metadata
        }
      }
    );
  }

  /**
   * Track business logic errors
   */
  static trackBusinessError(domain: string, action: string, error: string, metadata?: Record<string, any>) {
    this.trackMessage(
      `Business Logic Error: ${domain}.${action}`,
      'error',
      {
        component: domain,
        action,
        metadata: {
          error,
          ...metadata
        }
      }
    );
  }

  /**
   * Start a transaction for performance monitoring
   */
  static startTransaction(name: string, operation = 'navigation') {
    return Sentry.startTransaction({
      name,
      op: operation,
    });
  }
}

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    ErrorTracker.trackError(event.error, {
      component: 'global',
      action: 'unhandled_error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    ErrorTracker.trackError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      {
        component: 'global',
        action: 'unhandled_rejection'
      }
    );
  });
}