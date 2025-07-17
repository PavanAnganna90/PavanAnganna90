/**
 * GraphQL Service
 *
 * Comprehensive GraphQL client and utilities for flexible data access:
 * - Apollo Client setup and configuration
 * - Type-safe query and mutation helpers
 * - Caching and real-time subscriptions
 * - Error handling and retry logic
 * - Batch operations and pagination
 * - Schema introspection and validation
 */

import {
  ApolloClient,
  DocumentNode,
  FetchResult,
  InMemoryCache,
  MutationOptions,
  OperationVariables,
  QueryOptions,
  SubscriptionOptions,
  createHttpLink,
  from,
  gql,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { GraphQLWsLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';

// GraphQL Schema Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  permissions: string[];
  teams: Team[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: User[];
  projects: Project[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  team: Team;
  repositories: Repository[];
  deployments: Deployment[];
  metrics: Metric[];
  alerts: Alert[];
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  branch: string;
  project: Project;
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: Issue[];
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  version: string;
  environment: string;
  status: DeploymentStatus;
  project: Project;
  startedAt: string;
  completedAt?: string;
  logs: DeploymentLog[];
  metrics: Metric[];
}

export interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags: Record<string, string>;
  project?: Project;
  deployment?: Deployment;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  project: Project;
  rules: AlertRule[];
  notifications: Notification[];
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: IntegrationStatus;
  config: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Enums
export type ProjectStatus = 'active' | 'inactive' | 'archived';
export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'suppressed';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

// Additional types for completeness
export interface Commit {
  id: string;
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  repository: Repository;
}

export interface PullRequest {
  id: string;
  title: string;
  status: string;
  author: string;
  repository: Repository;
  createdAt: string;
}

export interface Issue {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  repository: Repository;
  createdAt: string;
}

export interface DeploymentLog {
  id: string;
  message: string;
  level: string;
  timestamp: string;
  deployment: Deployment;
}

export interface AlertRule {
  id: string;
  condition: string;
  threshold: number;
  alert: Alert;
}

export interface Notification {
  id: string;
  type: string;
  recipient: string;
  status: string;
  alert: Alert;
  sentAt?: string;
}

// Pagination types
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface Connection<T> {
  edges: Array<{
    node: T;
    cursor: string;
  }>;
  pageInfo: PageInfo;
  totalCount: number;
}

// Input types for mutations
export interface CreateUserInput {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  permissions?: string[];
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  role?: string;
  avatar?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  teamId: string;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateDeploymentInput {
  projectId: string;
  version: string;
  environment: string;
}

export interface CreateAlertInput {
  projectId: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  rules: Array<{
    condition: string;
    threshold: number;
  }>;
}

// GraphQL Queries
export const GET_USERS = gql`
  query GetUsers($first: Int, $after: String, $filter: UserFilter) {
    users(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          email
          name
          role
          avatar
          isActive
          permissions
          createdAt
          updatedAt
          teams {
            id
            name
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      name
      role
      avatar
      isActive
      permissions
      createdAt
      updatedAt
      teams {
        id
        name
        description
        projects {
          id
          name
          status
        }
      }
    }
  }
`;

export const GET_PROJECTS = gql`
  query GetProjects($first: Int, $after: String, $filter: ProjectFilter) {
    projects(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          name
          description
          status
          createdAt
          updatedAt
          team {
            id
            name
          }
          repositories {
            id
            name
            url
            branch
          }
          deployments(first: 5, orderBy: { field: CREATED_AT, direction: DESC }) {
            edges {
              node {
                id
                version
                environment
                status
                startedAt
                completedAt
              }
            }
          }
          alerts(first: 10, filter: { status: OPEN }) {
            edges {
              node {
                id
                title
                severity
                status
                createdAt
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_PROJECT_DETAILS = gql`
  query GetProjectDetails($id: ID!) {
    project(id: $id) {
      id
      name
      description
      status
      createdAt
      updatedAt
      team {
        id
        name
        members {
          id
          name
          email
          role
        }
      }
      repositories {
        id
        name
        url
        branch
        commits(first: 10) {
          edges {
            node {
              id
              sha
              message
              author
              timestamp
            }
          }
        }
        pullRequests(first: 5, filter: { status: OPEN }) {
          edges {
            node {
              id
              title
              status
              author
              createdAt
            }
          }
        }
      }
      deployments(first: 20, orderBy: { field: CREATED_AT, direction: DESC }) {
        edges {
          node {
            id
            version
            environment
            status
            startedAt
            completedAt
            metrics(first: 5) {
              edges {
                node {
                  id
                  name
                  value
                  unit
                  timestamp
                }
              }
            }
          }
        }
      }
      metrics(first: 100, timeRange: { start: $startTime, end: $endTime }) {
        edges {
          node {
            id
            name
            value
            unit
            timestamp
            tags
          }
        }
      }
      alerts(first: 50) {
        edges {
          node {
            id
            title
            description
            severity
            status
            createdAt
            updatedAt
            rules {
              id
              condition
              threshold
            }
            notifications {
              id
              type
              recipient
              status
              sentAt
            }
          }
        }
      }
    }
  }
`;

export const GET_DEPLOYMENTS = gql`
  query GetDeployments($first: Int, $after: String, $filter: DeploymentFilter) {
    deployments(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          version
          environment
          status
          startedAt
          completedAt
          project {
            id
            name
          }
          logs(first: 100) {
            edges {
              node {
                id
                message
                level
                timestamp
              }
            }
          }
          metrics {
            id
            name
            value
            unit
            timestamp
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_METRICS = gql`
  query GetMetrics($filter: MetricFilter!, $timeRange: TimeRangeInput!) {
    metrics(filter: $filter, timeRange: $timeRange) {
      edges {
        node {
          id
          name
          value
          unit
          timestamp
          tags
          project {
            id
            name
          }
          deployment {
            id
            version
            environment
          }
        }
      }
      aggregations {
        avg
        min
        max
        sum
        count
      }
    }
  }
`;

export const GET_ALERTS = gql`
  query GetAlerts($first: Int, $after: String, $filter: AlertFilter) {
    alerts(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          title
          description
          severity
          status
          createdAt
          updatedAt
          project {
            id
            name
          }
          rules {
            id
            condition
            threshold
          }
          notifications {
            id
            type
            recipient
            status
            sentAt
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_INTEGRATIONS = gql`
  query GetIntegrations($first: Int, $after: String, $filter: IntegrationFilter) {
    integrations(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          id
          name
          type
          provider
          status
          enabled
          config
          createdAt
          updatedAt
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

// GraphQL Mutations
export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user {
        id
        email
        name
        role
        avatar
        permissions
        isActive
        createdAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      user {
        id
        email
        name
        role
        avatar
        permissions
        isActive
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      errors {
        message
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      project {
        id
        name
        description
        status
        team {
          id
          name
        }
        createdAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($input: UpdateProjectInput!) {
    updateProject(input: $input) {
      project {
        id
        name
        description
        status
        updatedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const CREATE_DEPLOYMENT = gql`
  mutation CreateDeployment($input: CreateDeploymentInput!) {
    createDeployment(input: $input) {
      deployment {
        id
        version
        environment
        status
        project {
          id
          name
        }
        startedAt
      }
      errors {
        field
        message
      }
    }
  }
`;

export const CREATE_ALERT = gql`
  mutation CreateAlert($input: CreateAlertInput!) {
    createAlert(input: $input) {
      alert {
        id
        title
        description
        severity
        status
        project {
          id
          name
        }
        rules {
          id
          condition
          threshold
        }
        createdAt
      }
      errors {
        field
        message
      }
    }
  }
`;

// GraphQL Subscriptions
export const DEPLOYMENT_STATUS_SUBSCRIPTION = gql`
  subscription DeploymentStatusUpdates($projectId: ID) {
    deploymentStatusUpdated(projectId: $projectId) {
      id
      version
      environment
      status
      startedAt
      completedAt
      project {
        id
        name
      }
    }
  }
`;

export const ALERT_SUBSCRIPTION = gql`
  subscription AlertUpdates($projectId: ID) {
    alertUpdated(projectId: $projectId) {
      id
      title
      description
      severity
      status
      project {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

export const METRICS_SUBSCRIPTION = gql`
  subscription MetricsUpdates($projectId: ID!, $metricNames: [String!]) {
    metricsUpdated(projectId: $projectId, metricNames: $metricNames) {
      id
      name
      value
      unit
      timestamp
      tags
      project {
        id
        name
      }
    }
  }
`;

// Apollo Client Setup
class GraphQLService {
  private client: ApolloClient<any>;

  constructor() {
    this.client = this.createClient();
  }

  private createClient(): ApolloClient<any> {
    // HTTP Link for queries and mutations
    const httpLink = createHttpLink({
      uri: process.env.REACT_APP_GRAPHQL_ENDPOINT || '/graphql',
    });

    // WebSocket Link for subscriptions
    const wsLink = new GraphQLWsLink({
      uri: process.env.REACT_APP_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql',
      options: {
        reconnect: true,
        connectionParams: () => ({
          authorization: `Bearer ${this.getAuthToken()}`,
        }),
      },
    });

    // Split link: use WebSocket for subscriptions, HTTP for everything else
    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
      },
      wsLink,
      httpLink
    );

    // Auth link to add authorization headers
    const authLink = setContext((_, { headers }) => ({
      headers: {
        ...headers,
        authorization: `Bearer ${this.getAuthToken()}`,
      },
    }));

    // Error handling link
    const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
      if (graphQLErrors) {
        graphQLErrors.forEach(({ message, locations, path }) => {
          console.error(
            `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
          );
        });
      }

      if (networkError) {
        console.error(`Network error: ${networkError}`);

        // Handle 401 errors by redirecting to login
        if ('statusCode' in networkError && networkError.statusCode === 401) {
          this.handleAuthError();
        }
      }
    });

    // Retry link for failed requests
    const retryLink = new RetryLink({
      delay: {
        initial: 300,
        max: Infinity,
        jitter: true,
      },
      attempts: {
        max: 3,
        retryIf: (error, _operation) => !!error && !error.message.includes('401'),
      },
    });

    // Cache configuration
    const cache = new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            users: {
              keyArgs: ['filter'],
              merge: (existing, incoming, { args }) => {
                if (args?.after) {
                  // Append to existing data for pagination
                  return {
                    ...incoming,
                    edges: [...(existing?.edges || []), ...incoming.edges],
                  };
                }
                return incoming;
              },
            },
            projects: {
              keyArgs: ['filter'],
              merge: (existing, incoming, { args }) => {
                if (args?.after) {
                  return {
                    ...incoming,
                    edges: [...(existing?.edges || []), ...incoming.edges],
                  };
                }
                return incoming;
              },
            },
            deployments: {
              keyArgs: ['filter'],
              merge: (existing, incoming, { args }) => {
                if (args?.after) {
                  return {
                    ...incoming,
                    edges: [...(existing?.edges || []), ...incoming.edges],
                  };
                }
                return incoming;
              },
            },
            alerts: {
              keyArgs: ['filter'],
              merge: (existing, incoming, { args }) => {
                if (args?.after) {
                  return {
                    ...incoming,
                    edges: [...(existing?.edges || []), ...incoming.edges],
                  };
                }
                return incoming;
              },
            },
          },
        },
        User: {
          fields: {
            teams: {
              merge: false, // Replace instead of merging
            },
          },
        },
        Project: {
          fields: {
            repositories: {
              merge: false,
            },
            deployments: {
              keyArgs: ['filter', 'orderBy'],
              merge: (existing, incoming, { args }) => {
                if (args?.after) {
                  return {
                    ...incoming,
                    edges: [...(existing?.edges || []), ...incoming.edges],
                  };
                }
                return incoming;
              },
            },
            alerts: {
              keyArgs: ['filter'],
              merge: (existing, incoming, { args }) => {
                if (args?.after) {
                  return {
                    ...incoming,
                    edges: [...(existing?.edges || []), ...incoming.edges],
                  };
                }
                return incoming;
              },
            },
          },
        },
      },
    });

    return new ApolloClient({
      link: from([errorLink, retryLink, authLink, splitLink]),
      cache,
      defaultOptions: {
        watchQuery: {
          errorPolicy: 'all',
          notifyOnNetworkStatusChange: true,
        },
        query: {
          errorPolicy: 'all',
        },
      },
    });
  }

  // Utility methods
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  private handleAuthError(): void {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  // Public API methods
  public getClient(): ApolloClient<any> {
    return this.client;
  }

  public async query<TData = any, TVariables = OperationVariables>(
    options: QueryOptions<TVariables, TData>
  ): Promise<TData> {
    const result = await this.client.query(options);
    return result.data;
  }

  public async mutate<TData = any, TVariables = OperationVariables>(
    options: MutationOptions<TData, TVariables>
  ): Promise<FetchResult<TData>> {
    return await this.client.mutate(options);
  }

  public subscribe<TData = any, TVariables = OperationVariables>(
    options: SubscriptionOptions<TVariables, TData>
  ) {
    return this.client.subscribe(options);
  }

  // Convenience methods for common operations
  public async getUsers(variables?: { first?: number; after?: string; filter?: any }) {
    return this.query({
      query: GET_USERS,
      variables,
    });
  }

  public async getUser(id: string) {
    return this.query({
      query: GET_USER,
      variables: { id },
    });
  }

  public async getProjects(variables?: { first?: number; after?: string; filter?: any }) {
    return this.query({
      query: GET_PROJECTS,
      variables,
    });
  }

  public async getProjectDetails(id: string, timeRange?: { start: string; end: string }) {
    return this.query({
      query: GET_PROJECT_DETAILS,
      variables: { id, ...timeRange },
    });
  }

  public async createUser(input: CreateUserInput) {
    return this.mutate({
      mutation: CREATE_USER,
      variables: { input },
    });
  }

  public async updateUser(input: UpdateUserInput) {
    return this.mutate({
      mutation: UPDATE_USER,
      variables: { input },
    });
  }

  public async createProject(input: CreateProjectInput) {
    return this.mutate({
      mutation: CREATE_PROJECT,
      variables: { input },
    });
  }

  public async createDeployment(input: CreateDeploymentInput) {
    return this.mutate({
      mutation: CREATE_DEPLOYMENT,
      variables: { input },
    });
  }

  public async createAlert(input: CreateAlertInput) {
    return this.mutate({
      mutation: CREATE_ALERT,
      variables: { input },
    });
  }

  // Real-time subscription helpers
  public subscribeToDeploymentUpdates(projectId?: string) {
    return this.subscribe({
      query: DEPLOYMENT_STATUS_SUBSCRIPTION,
      variables: { projectId },
    });
  }

  public subscribeToAlertUpdates(projectId?: string) {
    return this.subscribe({
      query: ALERT_SUBSCRIPTION,
      variables: { projectId },
    });
  }

  public subscribeToMetricsUpdates(projectId: string, metricNames?: string[]) {
    return this.subscribe({
      query: METRICS_SUBSCRIPTION,
      variables: { projectId, metricNames },
    });
  }

  // Cache management
  public clearCache(): void {
    this.client.clearStore();
  }

  public refetchQueries(include?: string[]): void {
    this.client.refetchQueries({
      include: include || 'active',
    });
  }

  // Optimistic updates helper
  public async optimisticUpdate<TData = any, TVariables = OperationVariables>(
    mutation: DocumentNode,
    variables: TVariables,
    optimisticResponse: TData,
    updateQueries?: Array<{
      query: DocumentNode;
      variables?: any;
      update: (data: TData, existingData: any) => any;
    }>
  ): Promise<FetchResult<TData>> {
    return this.client.mutate({
      mutation,
      variables,
      optimisticResponse,
      update: (cache, { data }) => {
        if (updateQueries && data) {
          updateQueries.forEach(({ query, variables: queryVars, update }) => {
            try {
              const existingData = cache.readQuery({
                query,
                variables: queryVars,
              });

              if (existingData) {
                const updatedData = update(data, existingData);
                cache.writeQuery({
                  query,
                  variables: queryVars,
                  data: updatedData,
                });
              }
            } catch (error) {
              console.warn('Failed to update cache for query:', error);
            }
          });
        }
      },
    });
  }
}

// Export singleton instance
export const graphqlService = new GraphQLService();
export default graphqlService;
