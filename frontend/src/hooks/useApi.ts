/**
 * React hooks for API interactions
 * Provides reusable hooks for common API operations
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService, ApiResponse } from '../services/apiService';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for API data fetching
 */
export function useApi<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetcher();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'API request failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for OAuth providers data
 */
export function useOAuthProviders() {
  return useApi(() => apiService.getOAuthProviders());
}

/**
 * Hook for health data
 */
export function useHealth() {
  return useApi(() => apiService.getHealth());
}

/**
 * Hook for dashboard metrics
 */
export function useDashboardMetrics() {
  return useApi(() => apiService.getDashboardMetrics());
}

/**
 * Hook for pipelines data
 */
export function usePipelines() {
  return useApi(() => apiService.getPipelines());
}

/**
 * Hook for organizations data
 */
export function useOrganizations() {
  return useApi(() => apiService.getOrganizations());
}

/**
 * Hook for users data
 */
export function useUsers() {
  return useApi(() => apiService.getUsers());
}

/**
 * Hook for alerts data
 */
export function useAlerts() {
  return useApi(() => apiService.getAlerts());
}

/**
 * Hook for infrastructure data
 */
export function useInfrastructure() {
  return useApi(() => apiService.getInfrastructure());
}

/**
 * Hook for manual API calls (e.g., form submissions)
 */
export function useApiCall<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(response.error || 'API call failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    execute,
    loading,
    error,
    clearError: () => setError(null),
  };
}