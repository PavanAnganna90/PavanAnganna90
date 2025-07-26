'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MetricsOverview } from '@/components/dashboard/MetricsOverview';
import { useHealth, useOrganizations, usePipelines, useAlerts } from '../../hooks/useApi';
import { apiService } from '@/services/apiService';
import { 
  Server, 
  Activity, 
  Zap, 
  Users, 
  GitBranch,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  User,
  Hash,
  ExternalLink,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * OpsSight Platform Engineering Dashboard
 * Redesigned with Orbit Platform Builder aesthetics
 */
function DashboardPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [cacheMetrics, setCacheMetrics] = useState<any>(null);
  const [serviceHealth, setServiceHealth] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch real data from backend
  const { data: healthData, loading: healthLoading, error: healthError } = useHealth();
  const { data: pipelinesData, loading: pipelinesLoading } = usePipelines();
  const { data: alertsData, loading: alertsLoading } = useAlerts();
  const { data: organizationsData, loading: orgLoading } = useOrganizations();

  useEffect(() => {
    setIsLoaded(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load dashboard metrics
      const metricsResponse = await apiService.getDashboardMetrics();
      if (metricsResponse.success) {
        setDashboardMetrics(metricsResponse.data);
      }

      // Load cache metrics
      const cacheResponse = await apiService.getCacheMetrics();
      if (cacheResponse.success) {
        setCacheMetrics(cacheResponse.data);
      }

      // Load service health
      const healthResponse = await apiService.getServiceHealth();
      if (healthResponse.success) {
        setServiceHealth(healthResponse.data || []);
      }

      // Load deployments
      const deploymentsResponse = await apiService.getDeployments();
      if (deploymentsResponse.success) {
        setDeployments(deploymentsResponse.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics from real data
  const metrics = [
    {
      title: "System Health",
      value: healthData?.status === 'healthy' ? "Healthy" : "Degraded",
      change: `${healthData?.service || 'OpsSight'} v${healthData?.version || '1.0.0'}`,
      changeType: (healthData?.status === 'healthy' ? "positive" : "warning") as const,
      icon: healthData?.status === 'healthy' ? CheckCircle : AlertTriangle
    },
    {
      title: "Cache Performance", 
      value: cacheMetrics ? `${Math.round(cacheMetrics.hit_rate * 100)}%` : "Loading...",
      change: cacheMetrics ? `${cacheMetrics.hits}/${cacheMetrics.total_requests} requests` : "Calculating...",
      changeType: (cacheMetrics?.hit_rate > 0.8 ? "positive" : "warning") as const,
      icon: Zap
    },
    {
      title: "Services Online",
      value: serviceHealth.length > 0 ? `${serviceHealth.filter(s => s.status === 'healthy').length}/${serviceHealth.length}` : "Loading...",
      change: serviceHealth.length > 0 ? `${serviceHealth.filter(s => s.status === 'error').length} issues` : "Checking...", 
      changeType: (serviceHealth.filter(s => s.status === 'error').length === 0 ? "positive" : "warning") as const,
      icon: Server
    },
    {
      title: "Recent Deployments",
      value: deployments.length > 0 ? deployments.filter(d => d.status === 'running').length.toString() : "0",
      change: deployments.length > 0 ? `${deployments.filter(d => d.status === 'failed').length} failed` : "No data",
      changeType: (deployments.filter(d => d.status === 'failed').length === 0 ? "positive" : "warning") as const,
      icon: GitBranch
    }
  ];

  // Use real service data or fallback to mock data
  const services = serviceHealth.length > 0 ? serviceHealth.map(service => ({
    name: service.name || "Unknown Service",
    description: service.description || "Service description not available",
    status: service.status || "unknown",
    version: service.version || "v1.0.0",
    lastDeployed: service.uptime || "Unknown",
    url: service.url
  })) : [
    {
      name: "OpsSight Backend API",
      description: "Core backend services for DevOps operations",
      status: healthData?.status === 'healthy' ? "healthy" as const : "warning" as const,
      version: healthData?.version || "v2.0.0",
      lastDeployed: "Running",
      url: undefined
    },
    {
      name: "Database Service",
      description: "PostgreSQL database with multi-level caching",
      status: healthData?.dependencies?.database ? "healthy" as const : "error" as const,
      version: "PostgreSQL 15",
      lastDeployed: "Connected", 
      url: undefined
    },
    {
      name: "Redis Cache",
      description: "High-performance distributed caching layer",
      status: healthData?.dependencies?.redis ? "healthy" as const : "error" as const,
      version: "Redis 7.0",
      lastDeployed: "Connected",
      url: undefined
    },
    {
      name: "Monitoring System",
      description: "Prometheus metrics and health monitoring",
      status: "healthy" as const,
      version: "v2.4.0",
      lastDeployed: "Active",
      url: undefined
    }
  ];

  // Use real deployment data or fallback to mock data
  const displayDeployments = deployments.length > 0 ? deployments.map(dep => ({
    service: dep.service || "Unknown Service",
    version: dep.version || "v1.0.0",
    author: dep.author || "system",
    timestamp: dep.timestamp || "Unknown time",
    status: dep.status || "unknown",
    commitHash: dep.commitHash || "unknown",
    environment: dep.environment || "unknown"
  })) : [
    {
      service: "OpsSight Backend",
      version: healthData?.version || "v2.0.0",
      author: "system",
      timestamp: "Active", 
      status: healthData?.status === 'healthy' ? "success" as const : "warning" as const,
      commitHash: "current",
      environment: healthData?.environment || "development"
    },
    {
      service: "Frontend Dashboard", 
      version: "v1.0.0",
      author: "frontend-team",
      timestamp: "Active",
      status: "success" as const, 
      commitHash: "latest",
      environment: "development"
    },
    {
      service: "Database Migration",
      version: "latest",
      author: "db-admin",
      timestamp: "Connected",
      status: healthData?.dependencies?.database ? "success" as const : "failed" as const,
      commitHash: "migration", 
      environment: healthData?.environment || "development"
    },
    {
      service: "Cache System",
      version: "v7.0",
      author: "cache-manager",
      timestamp: "Active",
      status: healthData?.dependencies?.redis ? "success" as const : "failed" as const,
      commitHash: "redis",
      environment: healthData?.environment || "development"
    }
  ];

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Monitor system health, deployments, and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm font-medium",
              healthData?.status === 'healthy' 
                ? "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                : "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                healthData?.status === 'healthy' ? "bg-green-500" : "bg-yellow-500"
              )}></div>
              <span>{healthData?.status === 'healthy' ? 'All Systems Operational' : 'System Status: ' + (healthData?.status || 'Checking...')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <TrendingUp className="h-4 w-4" />
              <span>Cache: {cacheMetrics ? `${Math.round(cacheMetrics.hit_rate * 100)}%` : 'Loading...'}</span>
            </div>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <Activity className={cn("h-4 w-4", loading && "animate-spin")} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <MetricsOverview />

        {/* Services Grid */}
        <section>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Services Status
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {services.map((service, index) => (
              <ServiceCard 
                key={service.name} 
                {...service}
              />
            ))}
          </div>
        </section>

        {/* Recent Deployments */}
        <section>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Recent Deployments
          </h2>
          <div className="space-y-4">
            {displayDeployments.map((deployment, index) => (
              <DeploymentCard 
                key={`${deployment.service}-${deployment.timestamp}`}
                {...deployment}
              />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

// ServiceCard Component
interface ServiceCardProps {
  name: string;
  description: string;
  status: 'healthy' | 'warning' | 'error';
  version: string;
  lastDeployed: string;
  url?: string;
  className?: string;
  style?: React.CSSProperties;
}

function ServiceCard({ name, description, status, version, lastDeployed, url, className, style }: ServiceCardProps) {
  const statusConfig = {
    healthy: { 
      color: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-50 dark:bg-green-950/50',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle 
    },
    warning: { 
      color: 'text-yellow-600 dark:text-yellow-400', 
      bg: 'bg-yellow-50 dark:bg-yellow-950/50',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: AlertTriangle 
    },
    error: { 
      color: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-50 dark:bg-red-950/50',
      border: 'border-red-200 dark:border-red-800',
      icon: AlertTriangle 
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("group hover:shadow-lg transition-all duration-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-0", className)} style={style}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">{name}</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
          </div>
          <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold", config.color, config.bg, config.border, "border")}>
            <StatusIcon className="h-3 w-3" />
            <span className="capitalize">{status}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Hash className="h-3 w-3" />
              <span>{version}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="h-3 w-3" />
              <span>{lastDeployed}</span>
            </div>
          </div>
          {url && (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span>View</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// DeploymentCard Component
interface DeploymentCardProps {
  service: string;
  version: string;
  author: string;
  timestamp: string;
  status: 'success' | 'in-progress' | 'failed';
  commitHash: string;
  environment: string;
  className?: string;
  style?: React.CSSProperties;
}

function DeploymentCard({ service, version, author, timestamp, status, commitHash, environment, className, style }: DeploymentCardProps) {
  const statusConfig = {
    success: { 
      color: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-50 dark:bg-green-950/50',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle 
    },
    'in-progress': { 
      color: 'text-blue-600 dark:text-blue-400', 
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Clock 
    },
    failed: { 
      color: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-50 dark:bg-red-950/50',
      border: 'border-red-200 dark:border-red-800',
      icon: AlertTriangle 
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("group hover:shadow-lg transition-all duration-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-0", className)} style={style}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <StatusIcon className={cn("h-4 w-4", config.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{service}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                  {version}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span>{commitHash}</span>
                </div>
                <span>{timestamp}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
              {environment}
            </span>
            <div className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border", config.color, config.bg, config.border)}>
              {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export the dashboard page wrapped with authentication protection
export default function ProtectedDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
