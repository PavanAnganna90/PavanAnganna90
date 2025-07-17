/**
 * Higher-Order Component for Route Protection
 *
 * Protects routes based on user permissions and roles
 */

import { useRouter } from 'next/navigation';
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface WithPermissionsOptions {
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  adminOnly?: boolean;
  resource?: string;
  action?: string;
  organizationId?: string;
  redirectTo?: string;
  fallback?: React.ComponentType;
}

/**
 * HOC to protect components/pages with permission checks
 */
export function withPermissions<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  options: WithPermissionsOptions = {}
) {
  const {
    permissions = [],
    roles = [],
    requireAll = false,
    adminOnly = false,
    resource,
    action,
    organizationId,
    redirectTo = '/unauthorized',
    fallback: FallbackComponent,
  } = options;

  const ProtectedComponent: React.FC<T> = (props) => {
    const router = useRouter();
    const { isAuthenticated, isLoading, hasPermission, hasRole, user } = useAuth();

    // Show loading state
    if (isLoading) {
      return (
        <div className="min-h-screen bg-kassow-dark flex items-center justify-center">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-8 w-8 text-kassow-accent mb-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <div className="text-kassow-light">Loading...</div>
          </div>
        </div>
      );
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      React.useEffect(() => {
        router.push('/auth/login');
      }, [router]);

      return null; // Will redirect
    }

    // Check admin requirement
    if (adminOnly && user?.role !== 'admin') {
      React.useEffect(() => {
        router.push(redirectTo);
      }, [router]);

      if (FallbackComponent) {
        return <FallbackComponent />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-kassow-dark">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-kassow-light mb-2">Access Denied</h2>
            <p className="text-slate-400">Administrator access required.</p>
          </div>
        </div>
      );
    }

    // Check resource/action permission
    if (resource && action) {
      const hasResourceAccess = hasPermission(`${action}:${resource}`, organizationId);
      if (!hasResourceAccess) {
        React.useEffect(() => {
          router.push(redirectTo);
        }, [router]);

        if (FallbackComponent) {
          return <FallbackComponent />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-kassow-dark">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-kassow-light mb-2">Access Denied</h2>
              <p className="text-slate-400">
                You don't have permission to {action} {resource}.
              </p>
            </div>
          </div>
        );
      }
    }

    // Check specific permissions
    if (permissions.length > 0) {
      const hasRequiredPermissions = requireAll
        ? permissions.every((permission) => hasPermission(permission, organizationId))
        : permissions.some((permission) => hasPermission(permission, organizationId));

      if (!hasRequiredPermissions) {
        React.useEffect(() => {
          router.push(redirectTo);
        }, [router]);

        if (FallbackComponent) {
          return <FallbackComponent />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-kassow-dark">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-kassow-light mb-2">Access Denied</h2>
              <p className="text-slate-400">
                Required permissions: {permissions.join(requireAll ? ' and ' : ' or ')}
              </p>
            </div>
          </div>
        );
      }
    }

    // Check specific roles
    if (roles.length > 0) {
      const hasRequiredRoles = requireAll
        ? roles.every((role) => hasRole(role))
        : roles.some((role) => hasRole(role));

      if (!hasRequiredRoles) {
        React.useEffect(() => {
          router.push(redirectTo);
        }, [router]);

        if (FallbackComponent) {
          return <FallbackComponent />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-kassow-dark">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-kassow-light mb-2">Access Denied</h2>
              <p className="text-slate-400">
                Required roles: {roles.join(requireAll ? ' and ' : ' or ')}
              </p>
            </div>
          </div>
        );
      }
    }

    // All checks passed, render the component
    return <WrappedComponent {...props} />;
  };

  ProtectedComponent.displayName = `withPermissions(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ProtectedComponent;
}

// Convenience HOCs for common use cases
export const withAuth = <T extends object>(Component: React.ComponentType<T>) =>
  withPermissions(Component, {});

export const withAdminAccess = <T extends object>(Component: React.ComponentType<T>) =>
  withPermissions(Component, { adminOnly: true });

export const withRoles = <T extends object>(
  Component: React.ComponentType<T>,
  roles: string[],
  requireAll = false
) => withPermissions(Component, { roles, requireAll });

export const withPermission = <T extends object>(
  Component: React.ComponentType<T>,
  permission: string,
  organizationId?: string
) => withPermissions(Component, { permissions: [permission], organizationId });

export const withResourceAccess = <T extends object>(
  Component: React.ComponentType<T>,
  resource: string,
  action: string,
  organizationId?: string
) => withPermissions(Component, { resource, action, organizationId });

// Default unauthorized page component
export const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-kassow-dark">
    <div className="max-w-md w-full text-center">
      <div className="bg-kassow-darker/80 backdrop-blur-lg shadow-2xl rounded-xl border border-gray-700/50 p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-kassow-light mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-6">
          You don't have permission to access this page. Please contact your administrator if you
          believe this is an error.
        </p>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-kassow-accent hover:bg-kassow-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kassow-accent focus:ring-offset-kassow-dark transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

export default withPermissions;
