'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoadingOverlay } from '../../components/ui/LoadingStates';
import { DashboardGrid, DashboardPanel, DashboardCard } from '../../components/layout';

// Pipeline interfaces
interface Pipeline {
  id: string;
  name: string;
  status: 'running' | 'success' | 'failed' | 'pending' | 'cancelled';
  branch: string;
  commit: {
    hash: string;
    message: string;
    author: string;
  };
  stages: PipelineStage[];
  duration: number;
  startedAt: string;
  triggeredBy: string;
  environment: string;
}

interface PipelineStage {
  id: string;
  name: string;
  status: 'running' | 'success' | 'failed' | 'pending' | 'skipped';
  duration?: number;
  startedAt?: string;
  logs?: string[];
}

interface Deployment {
  id: string;
  environment: string;
  status: 'deployed' | 'deploying' | 'failed' | 'rolling-back';
  version: string;
  service: string;
  deployedAt: string;
  deployedBy: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  instances: {
    running: number;
    total: number;
  };
}

interface PipelineMetrics {
  totalPipelines: number;
  successRate: number;
  averageDuration: number;
  failureRate: number;
  deploymentsToday: number;
  activeBuilds: number;
}

function PipelinesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'active' | 'history' | 'deployments'>('overview');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');

  // Mock data - replace with real API calls
  const [metrics, setMetrics] = useState<PipelineMetrics>({
    totalPipelines: 45,
    successRate: 94.2,
    averageDuration: 8.4,
    failureRate: 5.8,
    deploymentsToday: 12,
    activeBuilds: 3
  });

  const [pipelines, setPipelines] = useState<Pipeline[]>([
    {
      id: 'pipe-001',
      name: 'auth-service-main',
      status: 'running',
      branch: 'main',
      commit: {
        hash: 'a7f3b2d',
        message: 'Fix authentication token refresh logic',
        author: 'john.doe'
      },
      stages: [
        { id: 'build', name: 'Build', status: 'success', duration: 120, startedAt: '2024-01-15T10:00:00Z' },
        { id: 'test', name: 'Test', status: 'success', duration: 180, startedAt: '2024-01-15T10:02:00Z' },
        { id: 'scan', name: 'Security Scan', status: 'running', startedAt: '2024-01-15T10:05:00Z' },
        { id: 'deploy', name: 'Deploy', status: 'pending' }
      ],
      duration: 420,
      startedAt: '2024-01-15T10:00:00Z',
      triggeredBy: 'push',
      environment: 'staging'
    },
    {
      id: 'pipe-002',
      name: 'payment-api-feature',
      status: 'success',
      branch: 'feature/stripe-integration',
      commit: {
        hash: 'b9c4e1f',
        message: 'Add Stripe payment integration',
        author: 'sarah.smith'
      },
      stages: [
        { id: 'build', name: 'Build', status: 'success', duration: 95, startedAt: '2024-01-15T09:30:00Z' },
        { id: 'test', name: 'Test', status: 'success', duration: 240, startedAt: '2024-01-15T09:32:00Z' },
        { id: 'scan', name: 'Security Scan', status: 'success', duration: 60, startedAt: '2024-01-15T09:36:00Z' },
        { id: 'deploy', name: 'Deploy', status: 'success', duration: 180, startedAt: '2024-01-15T09:37:00Z' }
      ],
      duration: 575,
      startedAt: '2024-01-15T09:30:00Z',
      triggeredBy: 'manual',
      environment: 'development'
    },
    {
      id: 'pipe-003',
      name: 'frontend-hotfix',
      status: 'failed',
      branch: 'hotfix/login-bug',
      commit: {
        hash: 'c2d5a8b',
        message: 'Fix login redirect issue',
        author: 'mike.wilson'
      },
      stages: [
        { id: 'build', name: 'Build', status: 'success', duration: 110, startedAt: '2024-01-15T09:00:00Z' },
        { id: 'test', name: 'Test', status: 'failed', duration: 45, startedAt: '2024-01-15T09:02:00Z' },
        { id: 'scan', name: 'Security Scan', status: 'skipped' },
        { id: 'deploy', name: 'Deploy', status: 'skipped' }
      ],
      duration: 155,
      startedAt: '2024-01-15T09:00:00Z',
      triggeredBy: 'push',
      environment: 'production'
    }
  ]);

  const [deployments, setDeployments] = useState<Deployment[]>([
    {
      id: 'dep-001',
      environment: 'production',
      status: 'deployed',
      version: 'v2.1.4',
      service: 'auth-service',
      deployedAt: '2024-01-15T08:30:00Z',
      deployedBy: 'john.doe',
      health: 'healthy',
      instances: { running: 5, total: 5 }
    },
    {
      id: 'dep-002',
      environment: 'staging',
      status: 'deploying',
      version: 'v2.2.0-rc1',
      service: 'payment-api',
      deployedAt: '2024-01-15T10:15:00Z',
      deployedBy: 'sarah.smith',
      health: 'healthy',
      instances: { running: 2, total: 3 }
    },
    {
      id: 'dep-003',
      environment: 'production',
      status: 'failed',
      version: 'v1.8.2',
      service: 'notification-service',
      deployedAt: '2024-01-15T07:45:00Z',
      deployedBy: 'mike.wilson',
      health: 'unhealthy',
      instances: { running: 0, total: 3 }
    }
  ]);

  useEffect(() => {
    const loadPipelines = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
    };
    
    loadPipelines();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'deployed':
      case 'healthy':
        return 'emerald';
      case 'running':
      case 'deploying':
        return 'blue';
      case 'pending':
        return 'amber';
      case 'failed':
      case 'unhealthy':
        return 'red';
      case 'cancelled':
      case 'skipped':
        return 'slate';
      case 'degraded':
        return 'orange';
      default:
        return 'slate';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const triggerBuild = (pipelineId: string) => {
    console.log(`Build triggered for pipeline ${pipelineId}`);
  };

  const retryPipeline = (pipelineId: string) => {
    console.log(`Retrying pipeline ${pipelineId}`);
  };

  return (
    <div className="min-h-screen bg-kassow-dark">
      {/* Header */}
      <div className="bg-kassow-darker/80 backdrop-blur-lg border-b border-gray-700/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-black text-kassow-light tracking-wide">CI/CD Pipelines</h1>
              <div className="flex items-center space-x-2 text-emerald-400">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                <span className="text-sm font-semibold">{metrics.activeBuilds} Active Builds</span>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-kassow-darker rounded-lg p-1 border border-gray-600">
                {['overview', 'active', 'history', 'deployments'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view as any)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                      selectedView === view
                        ? 'bg-kassow-accent text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => triggerBuild('new')}
                className="px-4 py-2 bg-kassow-accent text-white font-medium rounded-lg hover:bg-kassow-accent-hover transition-colors"
              >
                Trigger Build
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <DashboardCard variant="accent" accentSide="left">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{metrics.totalPipelines}</div>
              <div className="text-slate-400 text-sm">Total Pipelines</div>
            </div>
          </DashboardCard>

          <DashboardCard variant="success" accentSide="left">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{metrics.successRate}%</div>
              <div className="text-slate-400 text-sm">Success Rate</div>
            </div>
          </DashboardCard>

          <DashboardCard variant="default" accentSide="left">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{metrics.averageDuration}m</div>
              <div className="text-slate-400 text-sm">Avg Duration</div>
            </div>
          </DashboardCard>

          <DashboardCard variant="warning" accentSide="left">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{metrics.failureRate}%</div>
              <div className="text-slate-400 text-sm">Failure Rate</div>
            </div>
          </DashboardCard>

          <DashboardCard variant="accent" accentSide="left">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{metrics.deploymentsToday}</div>
              <div className="text-slate-400 text-sm">Deployments Today</div>
            </div>
          </DashboardCard>

          <DashboardCard variant="default" accentSide="left">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{metrics.activeBuilds}</div>
              <div className="text-slate-400 text-sm">Active Builds</div>
            </div>
          </DashboardCard>
        </div>

        {/* Dynamic Content Based on Selected View */}
        {selectedView === 'overview' && (
          <DashboardGrid>
            {/* Recent Pipelines */}
            <DashboardPanel variant="command-center" title="Recent Pipelines">
              <DashboardCard>
                <div className="space-y-4">
                  {pipelines.slice(0, 5).map((pipeline) => {
                    const statusColor = getStatusColor(pipeline.status);
                    const runningStages = pipeline.stages.filter(s => s.status === 'running').length;
                    const completedStages = pipeline.stages.filter(s => s.status === 'success').length;
                    
                    return (
                      <div key={pipeline.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full bg-${statusColor}-500 ${pipeline.status === 'running' ? 'animate-pulse' : ''}`}></div>
                            <div>
                              <h4 className="text-white font-semibold">{pipeline.name}</h4>
                              <div className="flex items-center space-x-2 text-sm text-slate-400">
                                <span>{pipeline.branch}</span>
                                <span>•</span>
                                <span className="font-mono">{pipeline.commit.hash}</span>
                                <span>•</span>
                                <span>{pipeline.commit.author}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-${statusColor}-400 capitalize font-semibold`}>{pipeline.status}</div>
                            <div className="text-slate-400 text-sm">{formatTimeAgo(pipeline.startedAt)}</div>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="text-slate-300 text-sm mb-2">{pipeline.commit.message}</div>
                        </div>
                        
                        {/* Pipeline Stages */}
                        <div className="flex items-center space-x-2 mb-3">
                          {pipeline.stages.map((stage, index) => {
                            const stageColor = getStatusColor(stage.status);
                            return (
                              <div key={stage.id} className="flex items-center space-x-1">
                                <div 
                                  className={`w-8 h-8 rounded-full bg-${stageColor}-500/20 border-2 border-${stageColor}-500 flex items-center justify-center ${
                                    stage.status === 'running' ? 'animate-pulse' : ''
                                  }`}
                                  title={`${stage.name}: ${stage.status}`}
                                >
                                  {stage.status === 'success' && (
                                    <svg className={`w-4 h-4 text-${stageColor}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  {stage.status === 'failed' && (
                                    <svg className={`w-4 h-4 text-${stageColor}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                  {stage.status === 'running' && (
                                    <div className={`w-2 h-2 bg-${stageColor}-400 rounded-full animate-pulse`}></div>
                                  )}
                                  {stage.status === 'pending' && (
                                    <div className={`w-2 h-2 bg-${stageColor}-400 rounded-full`}></div>
                                  )}
                                </div>
                                {index < pipeline.stages.length - 1 && (
                                  <div className={`w-4 h-0.5 bg-slate-600 ${stage.status === 'success' ? 'bg-emerald-500' : ''}`}></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-slate-400">
                            {completedStages}/{pipeline.stages.length} stages • Duration: {formatDuration(pipeline.duration)}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded capitalize">
                              {pipeline.triggeredBy}
                            </span>
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                              {pipeline.environment}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DashboardCard>
            </DashboardPanel>

            {/* Deployment Status */}
            <DashboardPanel variant="action-insights" title="Recent Deployments">
              <DashboardCard>
                <div className="space-y-4">
                  {deployments.map((deployment) => {
                    const statusColor = getStatusColor(deployment.status);
                    const healthColor = getStatusColor(deployment.health);
                    
                    return (
                      <div key={deployment.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full bg-${statusColor}-500 ${deployment.status === 'deploying' ? 'animate-pulse' : ''}`}></div>
                            <div>
                              <h4 className="text-white font-semibold">{deployment.service}</h4>
                              <div className="text-slate-400 text-sm">{deployment.version}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-${statusColor}-400 capitalize font-semibold`}>{deployment.status}</div>
                            <div className="text-slate-400 text-sm">{formatTimeAgo(deployment.deployedAt)}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-slate-400 text-xs mb-1">Environment</div>
                            <div className="text-white text-sm capitalize">{deployment.environment}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-xs mb-1">Deployed By</div>
                            <div className="text-white text-sm">{deployment.deployedBy}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full bg-${healthColor}-500`}></div>
                            <span className={`text-${healthColor}-400 text-sm capitalize`}>{deployment.health}</span>
                          </div>
                          <div className="text-slate-400 text-sm">
                            Instances: {deployment.instances.running}/{deployment.instances.total}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DashboardCard>
            </DashboardPanel>
          </DashboardGrid>
        )}

        {(selectedView === 'active' || selectedView === 'history') && (
          <div className="space-y-6">
            {pipelines
              .filter(p => selectedView === 'active' ? ['running', 'pending'].includes(p.status) : true)
              .map((pipeline) => {
                const statusColor = getStatusColor(pipeline.status);
                
                return (
                  <DashboardCard key={pipeline.id} variant="default">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full bg-${statusColor}-500 ${pipeline.status === 'running' ? 'animate-pulse' : ''}`}></div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">{pipeline.name}</h3>
                          <div className="flex items-center space-x-3 text-sm text-slate-400 mt-1">
                            <span>{pipeline.branch}</span>
                            <span>•</span>
                            <span className="font-mono">{pipeline.commit.hash}</span>
                            <span>•</span>
                            <span>{pipeline.commit.author}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(pipeline.startedAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className={`text-${statusColor}-400 capitalize font-semibold`}>{pipeline.status}</div>
                          <div className="text-slate-400 text-sm">Duration: {formatDuration(pipeline.duration)}</div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {pipeline.status === 'failed' && (
                            <button
                              onClick={() => retryPipeline(pipeline.id)}
                              className="px-3 py-1 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 transition-colors"
                            >
                              Retry
                            </button>
                          )}
                          <button className="px-3 py-1 bg-slate-600 text-white text-sm rounded-md hover:bg-slate-500 transition-colors">
                            Logs
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-slate-300 text-sm">{pipeline.commit.message}</div>
                    </div>
                    
                    {/* Detailed Stage View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {pipeline.stages.map((stage) => {
                        const stageColor = getStatusColor(stage.status);
                        
                        return (
                          <div key={stage.id} className={`bg-slate-700/30 rounded-lg p-3 border border-${stageColor}-500/30`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-3 h-3 rounded-full bg-${stageColor}-500 ${stage.status === 'running' ? 'animate-pulse' : ''}`}></div>
                              <h4 className="text-white font-medium">{stage.name}</h4>
                            </div>
                            
                            <div className={`text-${stageColor}-400 text-sm capitalize mb-1`}>{stage.status}</div>
                            
                            {stage.duration && (
                              <div className="text-slate-400 text-xs">
                                Duration: {formatDuration(stage.duration)}
                              </div>
                            )}
                            
                            {stage.startedAt && (
                              <div className="text-slate-400 text-xs">
                                Started: {formatTimeAgo(stage.startedAt)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <span>Triggered by: {pipeline.triggeredBy}</span>
                        <span>Environment: {pipeline.environment}</span>
                      </div>
                    </div>
                  </DashboardCard>
                );
              })}
          </div>
        )}

        {selectedView === 'deployments' && (
          <div className="space-y-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Deployment History</h3>
              <select 
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                className="bg-kassow-darker border border-gray-600 text-white px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kassow-accent"
              >
                <option value="all">All Environments</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>
            
            {deployments
              .filter(d => selectedEnvironment === 'all' || d.environment === selectedEnvironment)
              .map((deployment) => {
                const statusColor = getStatusColor(deployment.status);
                const healthColor = getStatusColor(deployment.health);
                
                return (
                  <DashboardCard key={deployment.id} variant="default">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Deployment Info */}
                      <div>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`w-4 h-4 rounded-full bg-${statusColor}-500 ${deployment.status === 'deploying' ? 'animate-pulse' : ''}`}></div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">{deployment.service}</h3>
                            <div className="text-slate-400 text-sm">{deployment.version}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Status:</span>
                            <span className={`text-${statusColor}-400 capitalize`}>{deployment.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Environment:</span>
                            <span className="text-white capitalize">{deployment.environment}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Deployed By:</span>
                            <span className="text-white">{deployment.deployedBy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Deployed:</span>
                            <span className="text-white">{formatTimeAgo(deployment.deployedAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Health Status */}
                      <div>
                        <h4 className="text-white font-semibold mb-3">Health Status</h4>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`w-3 h-3 rounded-full bg-${healthColor}-500`}></div>
                          <span className={`text-${healthColor}-400 capitalize`}>{deployment.health}</span>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-400 text-sm">Instance Health</span>
                            <span className="text-white text-sm">{deployment.instances.running}/{deployment.instances.total}</span>
                          </div>
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div 
                              className={`bg-${healthColor}-500 h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${(deployment.instances.running / deployment.instances.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div>
                        <div className="space-y-3">
                          <button className="w-full py-2 px-3 bg-kassow-accent text-white rounded-md hover:bg-kassow-accent-hover transition-colors text-sm">
                            View Details
                          </button>
                          {deployment.status === 'deployed' && (
                            <button className="w-full py-2 px-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-sm">
                              Rollback
                            </button>
                          )}
                          {deployment.status === 'failed' && (
                            <button className="w-full py-2 px-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm">
                              Redeploy
                            </button>
                          )}
                          <button className="w-full py-2 px-3 bg-slate-600 text-slate-300 rounded-md hover:bg-slate-500 transition-colors text-sm">
                            View Logs
                          </button>
                        </div>
                      </div>
                    </div>
                  </DashboardCard>
                );
              })}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <LoadingOverlay 
          isLoading={true}
          message="Loading pipeline data..."
        >
          <div></div>
        </LoadingOverlay>
      )}
    </div>
  );
}

// Export the component directly for now to avoid SSG issues
export default PipelinesPage;