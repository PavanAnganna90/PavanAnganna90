'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useHealth, useOrganizations, usePipelines, useAlerts } from '../../hooks/useApi';
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
  ExternalLink
} from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";

/**
 * OpsSight Platform Engineering Dashboard
 * Redesigned with Orbit Platform Builder aesthetics
 */
function DashboardPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Fetch real data from backend
  const { data: healthData, loading: healthLoading, error: healthError } = useHealth();
  const { data: pipelinesData, loading: pipelinesLoading } = usePipelines();
  const { data: alertsData, loading: alertsLoading } = useAlerts();
  const { data: organizationsData, loading: orgLoading } = useOrganizations();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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
      title: "Backend Status", 
      value: healthLoading ? "Checking..." : (healthError ? "Offline" : "Online"),
      change: healthError ? "Connection failed" : "API responsive",
      changeType: (healthError ? "negative" : "positive") as const,
      icon: Activity
    },
    {
      title: "Deployments Today",
      value: "12",
      change: "+4 vs yesterday", 
      changeType: "positive" as const,
      icon: GitBranch
    },
    {
      title: "Active Developers",
      value: "8",
      change: "2 deploying now",
      changeType: "neutral" as const,
      icon: Users
    }
  ];

  const services = [
    {
      name: "User Authentication API",
      description: "Core authentication service handling user login/logout",
      status: "healthy" as const,
      version: "v2.1.4",
      lastDeployed: "2 hours ago",
      url: "https://auth.platform.com"
    },
    {
      name: "Payment Processing",
      description: "Handles all payment transactions and billing",
      status: "warning" as const, 
      version: "v1.8.2",
      lastDeployed: "1 day ago",
      url: "https://payments.platform.com"
    },
    {
      name: "Analytics Engine",
      description: "Real-time data processing and analytics",
      status: "healthy" as const,
      version: "v3.0.1", 
      lastDeployed: "3 hours ago"
    },
    {
      name: "Notification Service",
      description: "Email, SMS and push notification delivery",
      status: "error" as const,
      version: "v1.5.3",
      lastDeployed: "2 days ago"
    }
  ];

  const deployments = [
    {
      service: "User Auth API",
      version: "v2.1.4",
      author: "sarah.dev",
      timestamp: "2 hours ago", 
      status: "success" as const,
      commitHash: "a1b2c3d",
      environment: "production"
    },
    {
      service: "Analytics Engine", 
      version: "v3.0.1",
      author: "mike.eng",
      timestamp: "3 hours ago",
      status: "success" as const, 
      commitHash: "e4f5g6h",
      environment: "production"
    },
    {
      service: "Payment Service",
      version: "v1.8.3",
      author: "alex.backend",
      timestamp: "1 hour ago",
      status: "in-progress" as const,
      commitHash: "i7j8k9l", 
      environment: "staging"
    },
    {
      service: "Notification API",
      version: "v1.5.4",
      author: "emma.ops",
      timestamp: "4 hours ago",
      status: "failed" as const,
      commitHash: "m1n2o3p",
      environment: "production" 
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-14 sm:pt-16">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text-primary">
                Platform Engineering
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage services, deployments, and infrastructure
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator status="healthy" label="All Systems Operational" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>99.9% uptime</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metrics Overview */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Platform Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <MetricCard 
                key={metric.title}
                {...metric}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              />
            ))}
          </div>
        </section>

        {/* Services Grid */}
        <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Services Status
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {services.map((service, index) => (
              <ServiceCard 
                key={service.name} 
                {...service}
                className="animate-slide-up"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              />
            ))}
          </div>
        </section>

        {/* Recent Deployments */}
        <section className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Recent Deployments
          </h2>
          <div className="space-y-4">
            {deployments.map((deployment, index) => (
              <DeploymentCard 
                key={`${deployment.service}-${deployment.timestamp}`}
                {...deployment}
                className="animate-slide-up"
                style={{ animationDelay: `${(index + 8) * 100}ms` }}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
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
