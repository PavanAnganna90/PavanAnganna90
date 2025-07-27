/**
 * Dashboard Hooks
 * React hooks for managing dashboard data and analytics
 */

import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:3003/api';

interface DashboardStats {
  totalUsers: number;
  connectedGitHubUsers: number;
  totalRepositories: number;
  totalStars: number;
  totalForks: number;
  topLanguages: Array<{ language: string; count: number }>;
  recentActivity: Array<{
    type: 'user_joined' | 'repo_created' | 'github_connected';
    user: string;
    timestamp: Date;
    details?: string;
  }>;
}

interface UserDashboard {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    githubConnected: boolean;
  };
  github?: {
    profile: any;
    repositories: any[];
    stats: {
      totalRepos: number;
      totalStars: number;
      totalForks: number;
      languages: string[];
    };
    activity: any;
  };
  summary: {
    joinedAt: Date;
    lastActive: Date;
    repositoriesCount: number;
    contributionsThisMonth: number;
  };
}

interface RepositoryInsights {
  totalRepositories: number;
  languages: string[];
  mostStarred: any[];
  recentlyUpdated: any[];
  totalStars: number;
  totalForks: number;
  languageStats: Record<string, number>;
}

interface ActivityTimeline {
  timeline: Array<{
    type: string;
    timestamp: Date;
    title: string;
    description: string;
    metadata?: any;
  }>;
  total: number;
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest<T>(endpoint: string): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data;
}

/**
 * Hook for platform-wide dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => makeAuthenticatedRequest<DashboardStats>('/dashboard/stats'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

/**
 * Hook for personalized user dashboard
 */
export function useUserDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'user'],
    queryFn: () => makeAuthenticatedRequest<UserDashboard>('/dashboard/user'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Hook for repository insights
 */
export function useRepositoryInsights() {
  return useQuery({
    queryKey: ['dashboard', 'repositories', 'insights'],
    queryFn: () => makeAuthenticatedRequest<RepositoryInsights>('/dashboard/repositories/insights'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if GitHub is not connected
      if (error instanceof Error && error.message.includes('not connected')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook for activity timeline
 */
export function useActivityTimeline() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => makeAuthenticatedRequest<ActivityTimeline>('/dashboard/activity'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Combined hook for dashboard overview data
 */
export function useDashboardOverview() {
  const statsQuery = useDashboardStats();
  const userQuery = useUserDashboard();
  const activityQuery = useActivityTimeline();

  const isLoading = statsQuery.isLoading || userQuery.isLoading || activityQuery.isLoading;
  const hasError = statsQuery.error || userQuery.error || activityQuery.error;

  return {
    stats: statsQuery.data,
    user: userQuery.data,
    activity: activityQuery.data,
    isLoading,
    hasError,
    refetch: () => {
      statsQuery.refetch();
      userQuery.refetch();
      activityQuery.refetch();
    },
  };
}

/**
 * Hook for GitHub-specific dashboard metrics
 */
export function useGitHubDashboardMetrics() {
  const userQuery = useUserDashboard();
  const insightsQuery = useRepositoryInsights();

  const githubData = userQuery.data?.github;
  const isGitHubConnected = userQuery.data?.user.githubConnected;

  const metrics = {
    isConnected: isGitHubConnected,
    profile: githubData?.profile,
    repositories: githubData?.repositories || [],
    stats: githubData?.stats || {
      totalRepos: 0,
      totalStars: 0,
      totalForks: 0,
      languages: [],
    },
    insights: insightsQuery.data,
    activity: githubData?.activity,
  };

  return {
    ...metrics,
    isLoading: userQuery.isLoading || (isGitHubConnected && insightsQuery.isLoading),
    error: userQuery.error || insightsQuery.error,
    refetch: () => {
      userQuery.refetch();
      if (isGitHubConnected) {
        insightsQuery.refetch();
      }
    },
  };
}