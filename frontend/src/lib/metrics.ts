import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Register default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Application metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

export const activeUsers = new Gauge({
  name: 'active_users_total',
  help: 'Number of active users',
  registers: [register]
});

export const activeSessions = new Gauge({
  name: 'active_sessions_total',
  help: 'Number of active sessions',
  registers: [register]
});

export const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register]
});

export const redisConnections = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections',
  registers: [register]
});

// Business metrics
export const dashboardViews = new Counter({
  name: 'dashboard_views_total',
  help: 'Total number of dashboard views',
  labelNames: ['dashboard_type', 'user_role'],
  registers: [register]
});

export const apiCalls = new Counter({
  name: 'api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['endpoint', 'method', 'status'],
  registers: [register]
});

export const errorRate = new Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'component'],
  registers: [register]
});

export const deploymentEvents = new Counter({
  name: 'deployment_events_total',
  help: 'Total number of deployment events',
  labelNames: ['environment', 'status'],
  registers: [register]
});

// Performance metrics
export const pageLoadTime = new Histogram({
  name: 'page_load_duration_seconds',
  help: 'Page load duration in seconds',
  labelNames: ['page', 'user_agent'],
  buckets: [0.5, 1, 2, 5, 10, 15],
  registers: [register]
});

export const webSocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

// Infrastructure metrics
export const kubernetesPods = new Gauge({
  name: 'kubernetes_pods_total',
  help: 'Number of Kubernetes pods',
  labelNames: ['namespace', 'status'],
  registers: [register]
});

export const cloudCosts = new Gauge({
  name: 'cloud_costs_usd',
  help: 'Cloud infrastructure costs in USD',
  labelNames: ['service', 'region'],
  registers: [register]
});

// Utility functions
export function recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
  httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
  httpRequestDuration.observe({ method, route, status_code: statusCode.toString() }, duration);
}

export function recordDashboardView(dashboardType: string, userRole: string) {
  dashboardViews.inc({ dashboard_type: dashboardType, user_role: userRole });
}

export function recordApiCall(endpoint: string, method: string, status: number) {
  apiCalls.inc({ endpoint, method, status: status.toString() });
}

export function recordError(errorType: string, component: string) {
  errorRate.inc({ error_type: errorType, component });
}

export function recordDeployment(environment: string, status: string) {
  deploymentEvents.inc({ environment, status });
}

export function recordPageLoad(page: string, userAgent: string, duration: number) {
  pageLoadTime.observe({ page, user_agent: userAgent }, duration);
}

export function updateActiveUsers(count: number) {
  activeUsers.set(count);
}

export function updateActiveSessions(count: number) {
  activeSessions.set(count);
}

export function updateDatabaseConnections(count: number) {
  databaseConnections.set(count);
}

export function updateWebSocketConnections(count: number) {
  webSocketConnections.set(count);
}

export function updateKubernetesPods(namespace: string, status: string, count: number) {
  kubernetesPods.set({ namespace, status }, count);
}

export function updateCloudCosts(service: string, region: string, cost: number) {
  cloudCosts.set({ service, region }, cost);
}

// Export the register for metrics endpoint
export { register };