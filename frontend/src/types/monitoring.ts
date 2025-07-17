export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'resolved' | 'acknowledged' | 'suppressed';
  metric: string;
  condition: {
    type: 'threshold' | 'anomaly' | 'absence';
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
    value: number;
    duration?: string; // e.g., "5m", "1h"
  };
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  firedAt?: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notifications: NotificationChannel[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams' | 'discord';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  testStatus?: {
    lastTested?: string;
    success: boolean;
    message?: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: Alert['condition'];
  severity: Alert['severity'];
  labels: Record<string, string>;
  annotations: Record<string, string>;
  evaluationInterval: string; // e.g., "30s", "1m"
  for: string; // e.g., "5m" - how long condition must be true
  enabled: boolean;
  notifications: string[]; // notification channel IDs
  silences?: string[]; // silence rule IDs
  createdAt: string;
  updatedAt: string;
  lastEvaluation?: {
    timestamp: string;
    status: 'ok' | 'firing' | 'pending' | 'error';
    value?: number;
    error?: string;
  };
}

export interface SilenceRule {
  id: string;
  comment: string;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  matchers: Array<{
    name: string;
    value: string;
    isRegex: boolean;
  }>;
  status: {
    state: 'active' | 'expired' | 'pending';
  };
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Alert['severity'];
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
  alerts: Alert[];
  timeline: IncidentEvent[];
  affectedServices: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  postmortem?: {
    summary: string;
    rootCause: string;
    resolution: string;
    lessonsLearned: string[];
    actionItems: Array<{
      description: string;
      assignee: string;
      dueDate: string;
      completed: boolean;
    }>;
  };
}

export interface IncidentEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'updated' | 'comment' | 'status_change' | 'assigned' | 'resolved';
  user: string;
  data: Record<string, any>;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  variables: DashboardVariable[];
  timeRange: {
    from: string;
    to: string;
  };
  refreshInterval?: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'gauge' | 'table' | 'heatmap' | 'alert';
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  queries: Array<{
    metric: string;
    aggregation?: string;
    groupBy?: string[];
    filters?: Record<string, string>;
  }>;
  visualization: {
    type: string;
    options: Record<string, any>;
  };
}

export interface DashboardVariable {
  name: string;
  label: string;
  type: 'query' | 'custom' | 'constant';
  query?: string;
  options?: Array<{ text: string; value: string }>;
  current: {
    text: string;
    value: string;
  };
  multi: boolean;
  includeAll: boolean;
}

export interface MetricQuery {
  metric: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p50' | 'p90' | 'p95' | 'p99';
  groupBy?: string[];
  filters?: Record<string, string | string[]>;
  timeRange?: {
    from: string;
    to: string;
  };
  interval?: string;
}

export interface MetricResult {
  metric: string;
  labels: Record<string, string>;
  values: Array<[number, number]>; // [timestamp, value]
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    address: string;
    severities: Alert['severity'][];
  };
  slack: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
    severities: Alert['severity'][];
  };
  browser: {
    enabled: boolean;
    severities: Alert['severity'][];
  };
  quiet_hours: {
    enabled: boolean;
    start: string; // e.g., "22:00"
    end: string;   // e.g., "08:00"
    timezone: string;
  };
  escalation: {
    enabled: boolean;
    rules: Array<{
      severity: Alert['severity'];
      delay: string; // e.g., "15m"
      contacts: string[];
    }>;
  };
}