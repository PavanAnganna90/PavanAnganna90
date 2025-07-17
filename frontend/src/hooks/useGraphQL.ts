/**
 * GraphQL React Hooks
 *
 * Custom React hooks for GraphQL operations:
 * - Type-safe query and mutation hooks
 * - Real-time subscription hooks
 * - Loading and error state management
 * - Pagination and caching utilities
 * - Optimistic updates and error handling
 */

import {
  ApolloError,
  FetchResult,
  UseMutationResult,
  UseQueryResult,
  useMutation,
  useQuery,
  useSubscription,
} from '@apollo/client';
import { useCallback, useState } from 'react';
import {
  ALERT_SUBSCRIPTION,
  Alert,
  CREATE_ALERT,
  CREATE_DEPLOYMENT,
  CREATE_PROJECT,
  CREATE_USER,
  Connection,
  CreateAlertInput,
  CreateDeploymentInput,
  CreateProjectInput,
  CreateUserInput,
  DELETE_USER,
  DEPLOYMENT_STATUS_SUBSCRIPTION,
  Deployment,
  GET_ALERTS,
  GET_DEPLOYMENTS,
  GET_INTEGRATIONS,
  GET_METRICS,
  GET_PROJECTS,
  GET_PROJECT_DETAILS,
  GET_USER,
  GET_USERS,
  Integration,
  METRICS_SUBSCRIPTION,
  Metric,
  Project,
  UPDATE_PROJECT,
  UPDATE_USER,
  UpdateProjectInput,
  UpdateUserInput,
  User,
  graphqlService,
} from '../services/graphqlService';

// Generic hook types
export interface PaginationOptions {
  first?: number;
  after?: string;
}

export interface FilterOptions {
  [key: string]: any;
}

export interface QueryHookResult<T> extends Omit<UseQueryResult<T>, 'data'> {
  data: T | undefined;
  isEmpty: boolean;
  hasData: boolean;
}

export interface ConnectionHookResult<T> extends QueryHookResult<Connection<T>> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export interface MutationHookResult<T, V> extends UseMutationResult<T, V> {
  isLoading: boolean;
  hasError: boolean;
  execute: (variables?: V) => Promise<FetchResult<T>>;
}

// User hooks
export function useUsers(
  options: {
    pagination?: PaginationOptions;
    filter?: FilterOptions;
    skip?: boolean;
  } = {}
): ConnectionHookResult<User> {
  const { pagination, filter, skip = false } = options;

  const { data, loading, error, fetchMore, refetch, ...rest } = useQuery(GET_USERS, {
    variables: { ...pagination, filter },
    skip,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const loadMore = useCallback(() => {
    if (data?.users.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: data.users.pageInfo.endCursor,
        },
      });
    }
  }, [data, fetchMore]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    data: data?.users,
    items: data?.users?.edges.map((edge: { node: User }) => edge.node) || [],
    totalCount: data?.users?.totalCount || 0,
    hasNextPage: data?.users?.pageInfo.hasNextPage || false,
    isEmpty: !loading && (!data?.users?.edges || data.users.edges.length === 0),
    hasData: !loading && !!data?.users?.edges && data.users.edges.length > 0,
    loading,
    error,
    loadMore,
    refresh,
    ...rest,
  };
}

export function useUser(id: string, skip?: boolean): QueryHookResult<{ user: User }> {
  const { data, loading, error, ...rest } = useQuery(GET_USER, {
    variables: { id },
    skip: skip || !id,
    errorPolicy: 'all',
  });

  return {
    data,
    isEmpty: !loading && !data?.user,
    hasData: !loading && !!data?.user,
    loading,
    error,
    ...rest,
  };
}

export function useCreateUser(): MutationHookResult<any, { input: CreateUserInput }> {
  const [createUser, { loading, error, ...rest }] = useMutation(CREATE_USER, {
    refetchQueries: [{ query: GET_USERS }],
    awaitRefetchQueries: true,
  });

  const execute = useCallback(
    async (variables?: { input: CreateUserInput }) => {
      if (!variables) throw new Error('Input is required');
      return await createUser({ variables });
    },
    [createUser]
  );

  return {
    execute,
    isLoading: loading,
    hasError: !!error,
    loading,
    error,
    ...rest,
  };
}

export function useUpdateUser(): MutationHookResult<any, { input: UpdateUserInput }> {
  const [updateUser, { loading, error, ...rest }] = useMutation(UPDATE_USER);

  const execute = useCallback(
    async (variables?: { input: UpdateUserInput }) => {
      if (!variables) throw new Error('Input is required');
      return await updateUser({ variables });
    },
    [updateUser]
  );

  return {
    execute,
    isLoading: loading,
    hasError: !!error,
    loading,
    error,
    ...rest,
  };
}

export function useDeleteUser(): MutationHookResult<any, { id: string }> {
  const [deleteUser, { loading, error, ...rest }] = useMutation(DELETE_USER, {
    refetchQueries: [{ query: GET_USERS }],
    awaitRefetchQueries: true,
  });

  const execute = useCallback(
    async (variables?: { id: string }) => {
      if (!variables) throw new Error('User ID is required');
      return await deleteUser({ variables });
    },
    [deleteUser]
  );

  return {
    execute,
    isLoading: loading,
    hasError: !!error,
    loading,
    error,
    ...rest,
  };
}

// Project hooks
export function useProjects(
  options: {
    pagination?: PaginationOptions;
    filter?: FilterOptions;
    skip?: boolean;
  } = {}
): ConnectionHookResult<Project> {
  const { pagination, filter, skip = false } = options;

  const { data, loading, error, fetchMore, refetch, ...rest } = useQuery(GET_PROJECTS, {
    variables: { ...pagination, filter },
    skip,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const loadMore = useCallback(() => {
    if (data?.projects.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: data.projects.pageInfo.endCursor,
        },
      });
    }
  }, [data, fetchMore]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    data: data?.projects,
    items: data?.projects?.edges.map((edge: { node: Project }) => edge.node) || [],
    totalCount: data?.projects?.totalCount || 0,
    hasNextPage: data?.projects?.pageInfo.hasNextPage || false,
    isEmpty: !loading && (!data?.projects?.edges || data.projects.edges.length === 0),
    hasData: !loading && !!data?.projects?.edges && data.projects.edges.length > 0,
    loading,
    error,
    loadMore,
    refresh,
    ...rest,
  };
}

export function useProject(
  id: string,
  timeRange?: { start: string; end: string },
  skip?: boolean
): QueryHookResult<{ project: Project }> {
  const { data, loading, error, ...rest } = useQuery(GET_PROJECT_DETAILS, {
    variables: { id, ...timeRange },
    skip: skip || !id,
    errorPolicy: 'all',
  });

  return {
    data,
    isEmpty: !loading && !data?.project,
    hasData: !loading && !!data?.project,
    loading,
    error,
    ...rest,
  };
}

export function useCreateProject(): MutationHookResult<any, { input: CreateProjectInput }> {
  const [createProject, { loading, error, ...rest }] = useMutation(CREATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
    awaitRefetchQueries: true,
  });

  const execute = useCallback(
    async (variables?: { input: CreateProjectInput }) => {
      if (!variables) throw new Error('Input is required');
      return await createProject({ variables });
    },
    [createProject]
  );

  return {
    execute,
    isLoading: loading,
    hasError: !!error,
    loading,
    error,
    ...rest,
  };
}

export function useUpdateProject(): MutationHookResult<any, { input: UpdateProjectInput }> {
  const [updateProject, { loading, error, ...rest }] = useMutation(UPDATE_PROJECT);

  const execute = useCallback(
    async (variables?: { input: UpdateProjectInput }) => {
      if (!variables) throw new Error('Input is required');
      return await updateProject({ variables });
    },
    [updateProject]
  );

  return {
    execute,
    isLoading: loading,
    hasError: !!error,
    loading,
    error,
    ...rest,
  };
}

// Deployment hooks
export function useDeployments(
  options: {
    pagination?: PaginationOptions;
    filter?: FilterOptions;
    skip?: boolean;
  } = {}
): ConnectionHookResult<Deployment> {
  const { pagination, filter, skip = false } = options;

  const { data, loading, error, fetchMore, refetch, ...rest } = useQuery(GET_DEPLOYMENTS, {
    variables: { ...pagination, filter },
    skip,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const loadMore = useCallback(() => {
    if (data?.deployments.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: data.deployments.pageInfo.endCursor,
        },
      });
    }
  }, [data, fetchMore]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    data: data?.deployments,
    items: data?.deployments?.edges.map((edge: { node: Deployment }) => edge.node) || [],
    totalCount: data?.deployments?.totalCount || 0,
    hasNextPage: data?.deployments?.pageInfo.hasNextPage || false,
    isEmpty: !loading && (!data?.deployments?.edges || data.deployments.edges.length === 0),
    hasData: !loading && !!data?.deployments?.edges && data.deployments.edges.length > 0,
    loading,
    error,
    loadMore,
    refresh,
    ...rest,
  };
}

export function useCreateDeployment(): MutationHookResult<any, { input: CreateDeploymentInput }> {
  const [createDeployment, { loading, error, ...rest }] = useMutation(CREATE_DEPLOYMENT, {
    refetchQueries: [{ query: GET_DEPLOYMENTS }, { query: GET_PROJECTS }],
  });

  const execute = useCallback(
    async (variables?: { input: CreateDeploymentInput }) => {
      if (!variables) throw new Error('Input is required');
      return await createDeployment({ variables });
    },
    [createDeployment]
  );

  return {
    execute,
    isLoading: loading,
    hasError: !!error,
    loading,
    error,
    ...rest,
  };
}

// Alert hooks
export function useAlerts(
  options: {
    pagination?: PaginationOptions;
    filter?: FilterOptions;
    skip?: boolean;
  } = {}
): ConnectionHookResult<Alert> {
  const { pagination, filter, skip = false } = options;

  const { data, loading, error, fetchMore, refetch, ...rest } = useQuery(GET_ALERTS, {
    variables: { ...pagination, filter },
    skip,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const loadMore = useCallback(() => {
    if (data?.alerts.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: data.alerts.pageInfo.endCursor,
        },
      });
    }
  }, [data, fetchMore]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    data: data?.alerts,
    items: data?.alerts?.edges.map((edge: { node: Alert }) => edge.node) || [],
    totalCount: data?.alerts?.totalCount || 0,
    hasNextPage: data?.alerts?.pageInfo.hasNextPage || false,
    isEmpty: !loading && (!data?.alerts?.edges || data.alerts.edges.length === 0),
    hasData: !loading && !!data?.alerts?.edges && data.alerts.edges.length > 0,
    loading,
    error,
    loadMore,
    refresh,
    ...rest,
  };
}

export function useCreateAlert(): MutationHookResult<any, { input: CreateAlertInput }> {
  const [createAlert, { loading, error, ...rest }] = useMutation(CREATE_ALERT, {
    refetchQueries: [{ query: GET_ALERTS }],
  });

  const execute = useCallback(
    async (variables?: { input: CreateAlertInput }) => {
      if (!variables) throw new Error('Input is required');
      return await createAlert({ variables });
    },
    [createAlert]
  );

  return {
    execute,
    isLoading: loading,
    hasError: !!error,
    loading,
    error,
    ...rest,
  };
}

// Metrics hooks
export function useMetrics(
  filter: FilterOptions,
  timeRange: { start: string; end: string },
  skip?: boolean
): QueryHookResult<{ metrics: Connection<Metric> }> {
  const { data, loading, error, ...rest } = useQuery(GET_METRICS, {
    variables: { filter, timeRange },
    skip: skip || !filter || !timeRange,
    errorPolicy: 'all',
  });

  return {
    data,
    isEmpty: !loading && (!data?.metrics?.edges || data.metrics.edges.length === 0),
    hasData: !loading && !!data?.metrics?.edges && data.metrics.edges.length > 0,
    loading,
    error,
    ...rest,
  };
}

// Integration hooks
export function useIntegrations(
  options: {
    pagination?: PaginationOptions;
    filter?: FilterOptions;
    skip?: boolean;
  } = {}
): ConnectionHookResult<Integration> {
  const { pagination, filter, skip = false } = options;

  const { data, loading, error, fetchMore, refetch, ...rest } = useQuery(GET_INTEGRATIONS, {
    variables: { ...pagination, filter },
    skip,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const loadMore = useCallback(() => {
    if (data?.integrations.pageInfo.hasNextPage) {
      fetchMore({
        variables: {
          after: data.integrations.pageInfo.endCursor,
        },
      });
    }
  }, [data, fetchMore]);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    data: data?.integrations,
    items: data?.integrations?.edges.map((edge: { node: Integration }) => edge.node) || [],
    totalCount: data?.integrations?.totalCount || 0,
    hasNextPage: data?.integrations?.pageInfo.hasNextPage || false,
    isEmpty: !loading && (!data?.integrations?.edges || data.integrations.edges.length === 0),
    hasData: !loading && !!data?.integrations?.edges && data.integrations.edges.length > 0,
    loading,
    error,
    loadMore,
    refresh,
    ...rest,
  };
}

// Real-time subscription hooks
export function useDeploymentUpdates(projectId?: string): {
  deployment: Deployment | undefined;
  loading: boolean;
  error: ApolloError | undefined;
} {
  const { data, loading, error } = useSubscription(DEPLOYMENT_STATUS_SUBSCRIPTION, {
    variables: { projectId },
    skip: !projectId,
  });

  return {
    deployment: data?.deploymentStatusUpdated,
    loading,
    error,
  };
}

export function useAlertUpdates(projectId?: string): {
  alert: Alert | undefined;
  loading: boolean;
  error: ApolloError | undefined;
} {
  const { data, loading, error } = useSubscription(ALERT_SUBSCRIPTION, {
    variables: { projectId },
    skip: !projectId,
  });

  return {
    alert: data?.alertUpdated,
    loading,
    error,
  };
}

export function useMetricsUpdates(
  projectId: string,
  metricNames?: string[]
): {
  metrics: Metric[] | undefined;
  loading: boolean;
  error: ApolloError | undefined;
} {
  const { data, loading, error } = useSubscription(METRICS_SUBSCRIPTION, {
    variables: { projectId, metricNames },
    skip: !projectId,
  });

  return {
    metrics: data?.metricsUpdated ? [data.metricsUpdated] : undefined,
    loading,
    error,
  };
}

// Combined real-time hooks for dashboard components
export function useProjectRealtime(projectId: string) {
  const deploymentUpdates = useDeploymentUpdates(projectId);
  const alertUpdates = useAlertUpdates(projectId);
  const metricsUpdates = useMetricsUpdates(projectId);

  return {
    deployment: deploymentUpdates.deployment,
    alert: alertUpdates.alert,
    metrics: metricsUpdates.metrics,
    loading: deploymentUpdates.loading || alertUpdates.loading || metricsUpdates.loading,
    error: deploymentUpdates.error || alertUpdates.error || metricsUpdates.error,
  };
}

// Advanced hooks for complex operations
export function usePaginatedQuery<T>(
  queryHook: (options: any) => ConnectionHookResult<T>,
  initialOptions: any = {}
) {
  const [options, setOptions] = useState(initialOptions);
  const result = queryHook(options);

  const setFilter = useCallback((filter: FilterOptions) => {
    setOptions((prev: any) => ({ ...prev, filter, pagination: { first: 20 } }));
  }, []);

  const setPage = useCallback((pagination: PaginationOptions) => {
    setOptions((prev: any) => ({ ...prev, pagination }));
  }, []);

  const reset = useCallback(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  return {
    ...result,
    setFilter,
    setPage,
    reset,
    currentOptions: options,
  };
}

export function useOptimisticMutation<TData, TVariables>(
  mutationHook: () => MutationHookResult<TData, TVariables>,
  optimisticUpdate?: (variables: TVariables) => Partial<TData>
) {
  const mutation = mutationHook();
  const [optimisticData, setOptimisticData] = useState<Partial<TData> | null>(null);

  const execute = useCallback(
    async (variables?: TVariables) => {
      if (!variables) throw new Error('Variables are required');

      if (optimisticUpdate) {
        setOptimisticData(optimisticUpdate(variables));
      }

      try {
        const result = await mutation.execute(variables);
        setOptimisticData(null);
        return result;
      } catch (error) {
        setOptimisticData(null);
        throw error;
      }
    },
    [mutation.execute, optimisticUpdate]
  );

  return {
    ...mutation,
    execute,
    optimisticData,
  };
}

// Error handling hook
export function useGraphQLError() {
  const [lastError, setLastError] = useState<ApolloError | null>(null);

  const handleError = useCallback((error: ApolloError) => {
    setLastError(error);

    // Log error for debugging
    console.error('GraphQL Error:', error);

    // Handle specific error types
    if (error.networkError) {
      console.error('Network Error:', error.networkError);
    }

    if (error.graphQLErrors) {
      error.graphQLErrors.forEach((gqlError: { message: string }) => {
        console.error('GraphQL Error:', gqlError.message);
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    handleError,
    clearError,
    hasError: !!lastError,
  };
}

// Cache management hook
export function useGraphQLCache() {
  const clearCache = useCallback(() => {
    graphqlService.clearCache();
  }, []);

  const refetchQueries = useCallback((include?: string[]) => {
    graphqlService.refetchQueries(include);
  }, []);

  return {
    clearCache,
    refetchQueries,
  };
}
