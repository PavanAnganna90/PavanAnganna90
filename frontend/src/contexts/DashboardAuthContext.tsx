'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest, ChangePasswordRequest } from '@/types/api';
import { api } from '@/lib/api-client';
import { AuthBypass } from '@/lib/auth-bypass';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';
      
      if (isDevMode) {
        console.log('🔧 Dev mode enabled - bypassing authentication');
        
        // Create a dev user directly without API calls
        const devUser: User = {
          id: 'dev-user-123',
          email: 'dev@example.com',
          name: 'Dev User',
          role: 'ADMIN',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setState(prev => ({
          ...prev,
          user: devUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
        
        console.log('✅ Dev auth bypass successful - user authenticated as admin');
        return;
      }

      // Normal auth flow for production
      if (api.auth.isAuthenticated()) {
        const response = await api.auth.getCurrentUser();
        setState(prev => ({
          ...prev,
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to initialize authentication',
      }));
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await api.auth.login(credentials);
      
      setState(prev => ({
        ...prev,
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await api.auth.register(userData);
      
      setState(prev => ({
        ...prev,
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
      }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await api.auth.logout();
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  };

  const changePassword = async (passwordData: ChangePasswordRequest) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await api.auth.changePassword(passwordData);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Password change failed',
      }));
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.auth.getCurrentUser();
      setState(prev => ({
        ...prev,
        user: response.data,
        error: null,
      }));
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to refresh user data',
      }));
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    changePassword,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      // In a real app, you might want to redirect to login
      // For now, we'll just show a message
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600">
              Please log in to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for role-based access control
export function useRoleAccess(requiredRole?: string) {
  const { user, isAuthenticated } = useAuth();
  
  const hasRole = (role: string): boolean => {
    if (!user || !isAuthenticated) return false;
    return user.role === role || user.role === 'ADMIN'; // Admin has access to everything
  };

  const hasAnyRole = (roles: string[]): boolean => {
    if (!user || !isAuthenticated) return false;
    return roles.some(role => hasRole(role));
  };

  const isAdmin = (): boolean => {
    return hasRole('ADMIN');
  };

  const canAccess = (): boolean => {
    if (!requiredRole) return isAuthenticated;
    return hasRole(requiredRole);
  };

  return {
    user,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    isAdmin,
    canAccess,
  };
}