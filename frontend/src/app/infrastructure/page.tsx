'use client';

import React from 'react';
import { Server, Activity, Zap, TrendingUp, User, Clock, GitCommit, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

// Professional Deployment Card Component matching the desired design
function DeploymentCard({ 
  serviceName,
  environment,
  version,
  author,
  commitHash,
  timeAgo,
  status
}: {
  serviceName: string;
  environment: string;
  version: string;
  author: string;
  commitHash: string;
  timeAgo: string;
  status: 'success' | 'progress' | 'failed';
}) {
  const statusConfig = {
    success: {
      icon: CheckCircle,
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      label: 'Success'
    },
    progress: {
      icon: AlertCircle,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      label: 'In Progress'
    },
    failed: {
      icon: XCircle,
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      label: 'Failed'
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{serviceName}</h3>
            <Server className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{environment}</span>
          </div>
          <p className="text-gray-600 text-sm mb-3">{version}</p>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}>
          <StatusIcon className="h-4 w-4" />
          <span>{config.label}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-1">
            <GitCommit className="h-3 w-3" />
            <span className="font-mono">{commitHash}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

export default function InfrastructurePage() {
  const deployments = [
    {
      serviceName: "User Auth API",
      environment: "production",
      version: "v2.1.4",
      author: "sarah.dev",
      commitHash: "a1b2c3d",
      timeAgo: "2 hours ago",
      status: "success" as const
    },
    {
      serviceName: "Analytics Engine",
      environment: "production", 
      version: "v3.0.1",
      author: "mike.eng",
      commitHash: "e4f5g6h",
      timeAgo: "3 hours ago",
      status: "success" as const
    },
    {
      serviceName: "Payment Service",
      environment: "staging",
      version: "v1.8.3",
      author: "alex.backend",
      commitHash: "i7j8k9l",
      timeAgo: "1 hour ago",
      status: "progress" as const
    },
    {
      serviceName: "Notification API",
      environment: "production",
      version: "v1.5.4",
      author: "emma.ops",
      commitHash: "m1n2o3p",
      timeAgo: "4 hours ago",
      status: "failed" as const
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-14 sm:pt-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">Platform Engineering</h1>
              <p className="text-gray-600 mt-2">Manage services, deployments, and infrastructure</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">All Systems Operational</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">99.9% uptime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Platform Overview Metrics */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Platform Overview</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-2">Active Services</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">24</p>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                    <TrendingUp className="h-3 w-3" />
                    <span>+2 this week</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-2">System Uptime</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">99.9%</p>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                    <TrendingUp className="h-3 w-3" />
                    <span>Last 30 days</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-2">Deployments Today</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">12</p>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                    <TrendingUp className="h-3 w-3" />
                    <span>+4 vs yesterday</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium mb-2">Active Developers</p>
                  <p className="text-3xl font-bold text-gray-900 mb-1">8</p>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-50">
                    <span>2 deploying now</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Deployments - Matching the desired design */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Zap className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Deployments</h2>
          </div>
          <div className="space-y-4">
            {deployments.map((deployment, index) => (
              <DeploymentCard
                key={index}
                {...deployment}
              />
            ))}
          </div>
        </section>

        {/* Resource Usage */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Resource Usage</h2>
          </div>
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">CPU Usage</span>
                  <span className="text-sm font-semibold text-blue-600">67%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: '67%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">Memory Usage</span>
                  <span className="text-sm font-semibold text-yellow-600">84%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-yellow-500 h-3 rounded-full transition-all duration-500" style={{ width: '84%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-900">Storage Usage</span>
                  <span className="text-sm font-semibold text-green-600">78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}