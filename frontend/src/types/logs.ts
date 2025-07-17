export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  source: {
    service: string;
    component?: string;
    instance?: string;
    pod?: string;
    node?: string;
    namespace?: string;
  };
  metadata: {
    traceId?: string;
    spanId?: string;
    userId?: string;
    requestId?: string;
    sessionId?: string;
    environment: 'production' | 'staging' | 'development' | 'testing';
    region?: string;
    version?: string;
  };
  labels: Record<string, string>;
  fields: Record<string, any>;
  stack?: string;
  context?: Record<string, any>;
}

export interface LogQuery {
  query: string;
  filters: {
    timeRange: {
      start: string;
      end: string;
      preset?: '15m' | '1h' | '6h' | '24h' | '7d' | '30d';
    };
    levels: LogEntry['level'][];
    services: string[];
    components: string[];
    environments: string[];
    regions: string[];
    labels: Record<string, string[]>;
    hasTraceId?: boolean;
    hasStack?: boolean;
  };
  sorting: {
    field: 'timestamp' | 'level' | 'service' | 'message';
    direction: 'asc' | 'desc';
  };
  pagination: {
    limit: number;
    offset: number;
  };
  highlighting?: {
    enabled: boolean;
    fields: string[];
  };
}

export interface LogSearchResult {
  entries: LogEntry[];
  total: number;
  aggregations: {
    levelCounts: Record<LogEntry['level'], number>;
    serviceCounts: Record<string, number>;
    timeDistribution: Array<{
      timestamp: string;
      count: number;
      levels: Record<LogEntry['level'], number>;
    }>;
    topErrors: Array<{
      message: string;
      count: number;
      services: string[];
      lastSeen: string;
    }>;
  };
  executionTime: number;
  queryHints?: string[];
}

export interface LogStream {
  id: string;
  name: string;
  description: string;
  query: LogQuery;
  enabled: boolean;
  color: string;
  alerting?: {
    enabled: boolean;
    conditions: Array<{
      type: 'count' | 'rate' | 'pattern';
      threshold: number;
      window: string; // e.g., "5m", "1h"
      comparison: 'gt' | 'lt' | 'eq';
      pattern?: string;
    }>;
    notifications: string[]; // notification channel IDs
  };
  retention: {
    days: number;
    autoArchive: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LogInsight {
  id: string;
  type: 'anomaly' | 'pattern' | 'correlation' | 'trend';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detection: {
    timestamp: string;
    confidence: number; // 0-100
    algorithm: string;
    parameters: Record<string, any>;
  };
  data: {
    affectedServices: string[];
    timeRange: {
      start: string;
      end: string;
    };
    metrics: Record<string, number>;
    samples: LogEntry[];
  };
  investigation: {
    status: 'open' | 'investigating' | 'resolved' | 'false_positive';
    assignee?: string;
    notes?: string;
    relatedIncidents?: string[];
  };
  actions: Array<{
    type: 'alert' | 'escalate' | 'suppress' | 'investigate';
    taken: boolean;
    timestamp?: string;
    result?: string;
  }>;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: LogQuery;
  tags: string[];
  shared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usage: {
    lastUsed?: string;
    useCount: number;
    popularity: number;
  };
}

export interface LogDashboard {
  id: string;
  name: string;
  description: string;
  widgets: LogWidget[];
  layout: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  variables: Array<{
    name: string;
    type: 'service' | 'environment' | 'timerange' | 'custom';
    options: string[];
    current: string;
  }>;
  refreshInterval?: number; // seconds
  shared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogWidget {
  id: string;
  type: 'logs' | 'chart' | 'stat' | 'table' | 'heatmap' | 'gauge';
  title: string;
  query: LogQuery;
  visualization: {
    type: 'line' | 'bar' | 'pie' | 'table' | 'number' | 'gauge' | 'heatmap';
    options: Record<string, any>;
  };
  refreshInterval?: number;
}

export interface LogMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels: string[];
  query: string;
  aggregation: 'count' | 'rate' | 'avg' | 'sum' | 'min' | 'max' | 'p50' | 'p90' | 'p95' | 'p99';
  unit?: string;
  thresholds?: Array<{
    value: number;
    color: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
}

export interface LogAlert {
  id: string;
  name: string;
  description: string;
  query: LogQuery;
  condition: {
    type: 'threshold' | 'change' | 'absence' | 'presence';
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains' | 'regex';
    value: any;
    window: string; // e.g., "5m", "1h"
    groupBy?: string[];
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notifications: string[];
  throttling: {
    enabled: boolean;
    period: string; // e.g., "15m"
    maxAlerts: number;
  };
  evaluation: {
    frequency: string; // e.g., "1m"
    timeout: string; // e.g., "30s"
  };
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LogContext {
  correlationId: string;
  entries: LogEntry[];
  timeline: Array<{
    timestamp: string;
    event: string;
    source: string;
    details: Record<string, any>;
  }>;
  traces?: Array<{
    traceId: string;
    spans: Array<{
      spanId: string;
      operationName: string;
      duration: number;
      tags: Record<string, string>;
      logs: LogEntry[];
    }>;
  }>;
  metrics?: Array<{
    name: string;
    value: number;
    timestamp: string;
    labels: Record<string, string>;
  }>;
}

export interface LogExport {
  id: string;
  name: string;
  query: LogQuery;
  format: 'json' | 'csv' | 'txt' | 'parquet';
  compression?: 'gzip' | 'zip' | 'none';
  destination: {
    type: 's3' | 'gcs' | 'local' | 'email';
    config: Record<string, any>;
  };
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  retention: {
    enabled: boolean;
    days: number;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: {
    processed: number;
    total: number;
    startedAt: string;
    estimatedCompletion?: string;
  };
  result?: {
    url: string;
    size: number;
    recordCount: number;
    completedAt: string;
    expiresAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LogParser {
  id: string;
  name: string;
  description: string;
  pattern: string;
  type: 'regex' | 'grok' | 'json' | 'csv' | 'multiline';
  fields: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'timestamp' | 'ip' | 'duration';
    mapping?: string;
    defaultValue?: any;
    validation?: {
      required: boolean;
      pattern?: string;
      min?: number;
      max?: number;
    };
  }>;
  samples: Array<{
    input: string;
    output: Record<string, any>;
    success: boolean;
  }>;
  testing: {
    lastTested?: string;
    successRate: number;
    performance: {
      averageTime: number;
      throughput: number;
    };
  };
  usage: {
    services: string[];
    ruleCount: number;
    processedEvents: number;
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}