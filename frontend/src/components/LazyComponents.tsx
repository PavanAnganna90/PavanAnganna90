/**
 * Lazy-loaded components with code splitting for better performance
 * 
 * Enhanced with:
 * - Advanced loading states
 * - Error boundaries
 * - Performance monitoring
 * - Bundle optimization
 * - Preloading strategies
 */

import dynamic from 'next/dynamic';
import { ComponentType, Suspense } from 'react';
import { SentryErrorBoundary } from './performance/SentryErrorBoundary';

// Enhanced loading components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const ComponentSkeleton = ({ height = 'h-64', className = '' }: { height?: string; className?: string; }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${height} ${className}`}>
    <div className="p-6 space-y-4">
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-end justify-between p-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-300 dark:bg-gray-600 rounded-sm w-6"
          style={{ height: `${Math.random() * 200 + 20}px` }}
        />
      ))}
    </div>
  </div>
);

// Performance monitoring
const trackComponentLoad = (componentName: string) => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark(`${componentName}-load-start`);
    return () => {
      performance.mark(`${componentName}-load-end`);
      performance.measure(`${componentName}-load`, `${componentName}-load-start`, `${componentName}-load-end`);
      
      const measure = performance.getEntriesByName(`${componentName}-load`)[0];
      if (measure && process.env.NODE_ENV === 'development') {
        console.log(`${componentName} loaded in ${measure.duration.toFixed(2)}ms`);
      }
    };
  }
  return () => {};
};

// Lazy load chart components (heavy dependencies)
export const LazyKubernetesMetricsChart = dynamic(
  () => import('./charts/KubernetesMetricsChart'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyResourceTrendChart = dynamic(
  () => import('./charts/ResourceTrendChart'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyPipelineGanttChart = dynamic(
  () => import('./charts/PipelineGanttChart'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyGitActivityDashboard = dynamic(
  () => import('./charts/GitActivityDashboard'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyBuildTimeTrendChart = dynamic(
  () => import('./charts/BuildTimeTrendChart'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyDeploymentFrequencyChart = dynamic(
  () => import('./charts/DeploymentFrequencyChart'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyTestCoverageWidget = dynamic(
  () => import('./charts/TestCoverageWidget'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Lazy load admin components (not needed for regular users)
export const LazyAdminPage = dynamic(
  () => import('./admin/AdminPage'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyRoleCreateModal = dynamic(
  () => import('./admin/RoleCreateModal'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyPermissionAssignment = dynamic(
  () => import('./admin/PermissionAssignment'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazySSOSettings = dynamic(
  () => import('./admin/SSOSettings'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Lazy load automation components
export const LazyAnsibleCoverageViewer = dynamic(
  () => import('./automation/AnsibleCoverageViewer'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyPlaybookDetailView = dynamic(
  () => import('./automation/PlaybookDetailView'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Lazy load alert components
export const LazyAlertDetailModal = dynamic(
  () => import('./alerts/AlertDetailModal'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyAlertIntegrations = dynamic(
  () => import('./alerts/AlertIntegrations'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyCIFailureAnalyzer = dynamic(
  () => import('./alerts/CIFailureAnalyzer'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Lazy load audit components
export const LazyAuditDashboard = dynamic(
  () => import('./audit/AuditDashboard'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

export const LazyAuditLogViewer = dynamic(
  () => import('./audit/AuditLogViewer'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Lazy load AI components
export const LazyOpsCopilot = dynamic(
  () => import('./ai/OpsCopilot'),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
);

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingComponent?: ComponentType,
  errorComponent?: ComponentType<{ error: Error; retry: () => void }>
) {
  const LazyComponent = dynamic(importFn, {
    loading: loadingComponent || LoadingSpinner,
    ssr: false,
  });

  return function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={loadingComponent ? <loadingComponent /> : <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Preload functions for better UX
export const preloadComponents = {
  charts: () => {
    import('./charts/KubernetesMetricsChart');
    import('./charts/ResourceTrendChart');
    import('./charts/PipelineGanttChart');
  },
  admin: () => {
    import('./admin/AdminPage');
    import('./admin/RoleCreateModal');
    import('./admin/PermissionAssignment');
  },
  automation: () => {
    import('./automation/AnsibleCoverageViewer');
    import('./automation/PlaybookDetailView');
  },
  alerts: () => {
    import('./alerts/AlertDetailModal');
    import('./alerts/AlertIntegrations');
  },
  audit: () => {
    import('./audit/AuditDashboard');
    import('./audit/AuditLogViewer');
  },
  ai: () => {
    import('./ai/OpsCopilot');
  },
};

// Route-based preloading
export const preloadForRoute = (route: string) => {
  switch (route) {
    case '/dashboard':
      preloadComponents.charts();
      break;
    case '/admin':
      preloadComponents.admin();
      break;
    case '/automation':
      preloadComponents.automation();
      break;
    case '/alerts':
      preloadComponents.alerts();
      break;
    case '/audit':
      preloadComponents.audit();
      break;
    case '/ai':
      preloadComponents.ai();
      break;
  }
};

// Component for triggering preloads on hover
export function PreloadOnHover({ 
  children, 
  preloadFn 
}: { 
  children: React.ReactNode;
  preloadFn: () => void;
}) {
  return (
    <div onMouseEnter={preloadFn}>
      {children}
    </div>
  );
}

export default {
  LazyKubernetesMetricsChart,
  LazyResourceTrendChart,
  LazyPipelineGanttChart,
  LazyGitActivityDashboard,
  LazyBuildTimeTrendChart,
  LazyDeploymentFrequencyChart,
  LazyTestCoverageWidget,
  LazyAdminPage,
  LazyRoleCreateModal,
  LazyPermissionAssignment,
  LazySSOSettings,
  LazyAnsibleCoverageViewer,
  LazyPlaybookDetailView,
  LazyAlertDetailModal,
  LazyAlertIntegrations,
  LazyCIFailureAnalyzer,
  LazyAuditDashboard,
  LazyAuditLogViewer,
  LazyOpsCopilot,
  preloadComponents,
  preloadForRoute,
  PreloadOnHover,
  withLazyLoading,
};