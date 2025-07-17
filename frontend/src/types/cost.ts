export interface CostData {
  current: {
    total: number;
    breakdown: CostBreakdown[];
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
  };
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
    confidence: number; // 0-100
  };
  budget: {
    monthly: number;
    quarterly: number;
    yearly: number;
    remaining: {
      monthly: number;
      quarterly: number;
      yearly: number;
    };
    alerts: BudgetAlert[];
  };
  historical: CostHistoricalData[];
  optimization: OptimizationRecommendation[];
  anomalies: CostAnomaly[];
}

export interface CostBreakdown {
  category: 'compute' | 'storage' | 'networking' | 'database' | 'monitoring' | 'security' | 'other';
  service: string;
  region?: string;
  environment: 'production' | 'staging' | 'development' | 'testing';
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
  unit: 'hour' | 'day' | 'month' | 'gb' | 'request' | 'vcpu';
  usage: {
    current: number;
    previous: number;
    unit: string;
  };
  tags: Record<string, string>;
}

export interface CostHistoricalData {
  date: string;
  total: number;
  categories: Record<string, number>;
  events?: CostEvent[];
}

export interface CostEvent {
  type: 'deployment' | 'scaling' | 'migration' | 'optimization' | 'incident';
  description: string;
  impact: number; // cost impact
  timestamp: string;
}

export interface BudgetAlert {
  id: string;
  type: 'threshold' | 'forecast' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  threshold: number;
  current: number;
  percentage: number;
  scope: 'total' | 'category' | 'service' | 'environment';
  target?: string; // specific service/category if scoped
  createdAt: string;
  acknowledged: boolean;
}

export interface OptimizationRecommendation {
  id: string;
  category: 'rightsizing' | 'scheduling' | 'storage' | 'networking' | 'reserved_instances' | 'spot_instances' | 'unused_resources';
  title: string;
  description: string;
  impact: {
    monthly: number;
    yearly: number;
    percentage: number;
  };
  effort: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  priority: number; // 1-10
  service: string;
  region?: string;
  environment?: string;
  implementation: {
    steps: string[];
    estimatedTime: string;
    requirements: string[];
  };
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface CostAnomaly {
  id: string;
  type: 'spike' | 'drop' | 'trend_change' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  category: string;
  region?: string;
  environment?: string;
  detection: {
    timestamp: string;
    value: number;
    expected: number;
    deviation: number; // percentage
    confidence: number; // 0-100
  };
  impact: {
    amount: number;
    duration: string;
  };
  possibleCauses: string[];
  investigation: {
    status: 'open' | 'investigating' | 'resolved' | 'false_positive';
    assignee?: string;
    notes?: string;
    resolution?: string;
  };
}

export interface CostOptimizationRule {
  id: string;
  name: string;
  description: string;
  type: 'automated' | 'manual' | 'advisory';
  category: OptimizationRecommendation['category'];
  enabled: boolean;
  conditions: {
    threshold?: number;
    duration?: string;
    usage?: number;
    tags?: Record<string, string>;
  };
  actions: {
    type: 'resize' | 'terminate' | 'schedule' | 'migrate' | 'alert';
    parameters: Record<string, any>;
  };
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  safety: {
    dryRun: boolean;
    approvalRequired: boolean;
    rollbackPlan: string;
  };
  metrics: {
    executions: number;
    savings: number;
    errors: number;
    lastRun?: string;
  };
}

export interface CostReport {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  filters: {
    services?: string[];
    categories?: string[];
    environments?: string[];
    regions?: string[];
    tags?: Record<string, string>;
    dateRange: {
      start: string;
      end: string;
    };
  };
  format: 'pdf' | 'csv' | 'json' | 'email';
  sections: {
    summary: boolean;
    breakdown: boolean;
    trends: boolean;
    forecast: boolean;
    recommendations: boolean;
    anomalies: boolean;
  };
  lastGenerated?: string;
  status: 'active' | 'paused' | 'error';
}

export interface CostWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'forecast';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: {
    metric?: string;
    timeRange?: string;
    aggregation?: string;
    filters?: Record<string, any>;
    visualization?: {
      chartType?: 'line' | 'bar' | 'pie' | 'area';
      colors?: string[];
      showLegend?: boolean;
    };
  };
  refreshInterval?: number; // seconds
}