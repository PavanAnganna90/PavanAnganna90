/**
 * GitHub Integration Hooks
 * React hooks for managing GitHub data and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  githubApiClient,
  GitHubProfile,
  GitHubRepository,
  GitHubActivity,
  GitHubSyncResult,
  GitHubSearchResult,
  CreateRepositoryData,
  RepositoryListOptions,
  SearchRepositoryOptions,
  GitHubValidation
} from '@/lib/github-api-client';

/**
 * Hook for managing GitHub profile data
 */
export function useGitHubProfile() {
  return useQuery({
    queryKey: ['github', 'profile'],
    queryFn: () => githubApiClient.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if user is not connected to GitHub
      if (error instanceof Error && error.message.includes('not connected')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

/**
 * Hook for syncing GitHub profile data
 */
export function useGitHubSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => githubApiClient.syncProfile(),
    onSuccess: (data: GitHubSyncResult) => {
      if (data.updated) {
        // Invalidate related queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['github'] });
      }
    },
  });
}

/**
 * Hook for managing GitHub repositories
 */
export function useGitHubRepositories(options: RepositoryListOptions = {}) {
  return useQuery({
    queryKey: ['github', 'repositories', options],
    queryFn: () => githubApiClient.getRepositories(options),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting a specific repository
 */
export function useGitHubRepository(repoName: string | null) {
  return useQuery({
    queryKey: ['github', 'repository', repoName],
    queryFn: () => githubApiClient.getRepository(repoName!),
    enabled: !!repoName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for creating repositories
 */
export function useCreateRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRepositoryData) => githubApiClient.createRepository(data),
    onSuccess: () => {
      // Invalidate repositories list to include new repository
      queryClient.invalidateQueries({ queryKey: ['github', 'repositories'] });
      queryClient.invalidateQueries({ queryKey: ['github', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['github', 'activity'] });
    },
  });
}

/**
 * Hook for searching repositories
 */
export function useSearchRepositories() {
  const [searchResults, setSearchResults] = useState<GitHubSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRepositories = useCallback(async (
    query: string,
    options: SearchRepositoryOptions = {}
  ) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await githubApiClient.searchRepositories(query, options);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults(null);
    setError(null);
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    searchRepositories,
    clearResults,
  };
}

/**
 * Hook for GitHub activity data
 */
export function useGitHubActivity() {
  return useQuery({
    queryKey: ['github', 'activity'],
    queryFn: () => githubApiClient.getActivity(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for disconnecting GitHub account
 */
export function useDisconnectGitHub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => githubApiClient.disconnectGitHub(),
    onSuccess: () => {
      // Clear all GitHub-related queries
      queryClient.removeQueries({ queryKey: ['github'] });
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Update user profile
    },
  });
}

/**
 * Hook for validating GitHub connection
 */
export function useGitHubValidation() {
  return useQuery({
    queryKey: ['github', 'validation'],
    queryFn: () => githubApiClient.validateConnection(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Combined hook for GitHub connection status and basic info
 */
export function useGitHubStatus() {
  const { data: validation, isLoading: validationLoading } = useGitHubValidation();
  const { data: profile, isLoading: profileLoading, error: profileError } = useGitHubProfile();

  const isConnected = validation?.isValid && !profileError;
  const isLoading = validationLoading || profileLoading;

  return {
    isConnected,
    isLoading,
    validation,
    profile,
    error: profileError,
  };
}

/**
 * Hook for managing GitHub statistics and insights
 */
export function useGitHubInsights() {
  const { data: profile } = useGitHubProfile();
  const { data: activity } = useGitHubActivity();

  const insights = {
    totalRepositories: profile?.stats.totalRepos || 0,
    totalStars: profile?.stats.totalStars || 0,
    totalForks: profile?.stats.totalForks || 0,
    languages: profile?.stats.languages || [],
    recentActivity: activity?.recentRepositories || [],
    repositoriesCount: activity?.repositoriesCount || 0,
  };

  return {
    insights,
    isLoading: !profile && !activity,
    hasData: !!(profile || activity),
  };
}

/**
 * Hook for paginated repository list with filtering
 */
export function usePaginatedRepositories(initialOptions: RepositoryListOptions = {}) {
  const [options, setOptions] = useState<RepositoryListOptions>({
    page: 1,
    per_page: 10,
    sort: 'updated',
    type: 'owner',
    ...initialOptions,
  });

  const query = useGitHubRepositories(options);

  const nextPage = useCallback(() => {
    setOptions(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
  }, []);

  const previousPage = useCallback(() => {
    setOptions(prev => ({ ...prev, page: Math.max((prev.page || 1) - 1, 1) }));
  }, []);

  const setPage = useCallback((page: number) => {
    setOptions(prev => ({ ...prev, page: Math.max(page, 1) }));
  }, []);

  const setSort = useCallback((sort: NonNullable<RepositoryListOptions['sort']>) => {
    setOptions(prev => ({ ...prev, sort, page: 1 }));
  }, []);

  const setType = useCallback((type: NonNullable<RepositoryListOptions['type']>) => {
    setOptions(prev => ({ ...prev, type, page: 1 }));
  }, []);

  const setPerPage = useCallback((per_page: number) => {
    setOptions(prev => ({ ...prev, per_page, page: 1 }));
  }, []);

  return {
    ...query,
    options,
    nextPage,
    previousPage,
    setPage,
    setSort,
    setType,
    setPerPage,
    hasNextPage: query.data ? (options.page || 1) * (options.per_page || 10) < query.data.pagination.total : false,
    hasPreviousPage: (options.page || 1) > 1,
  };
}