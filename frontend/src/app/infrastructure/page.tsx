'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { LoadingOverlay } from '../../components/ui/LoadingStates';
import { DashboardGrid, DashboardPanel, DashboardCard } from '../../components/layout';
import { withPermissions } from '../../components/rbac/withPermissions';
import { PermissionGuard } from '../../components/rbac/PermissionGuard';

// Infrastructure interfaces
interface K8sNode {
  name: string;
  status: 'ready' | 'not-ready' | 'unknown';
  role: 'master' | 'worker';
  version: string;
  cpu: { used: number; total: number };
  memory: { used: number; total: number };
  pods: { running: number; total: number };
  uptime: string;
  region: string;
}

interface K8sNamespace {
  name: string;
  status: 'active' | 'terminating';
  pods: number;
  services: number;
  deployments: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface K8sPod {
  name: string;
  namespace: string;
  status: 'running' | 'pending' | 'failed' | 'succeeded';
  node: string;
  cpu: number;
  memory: number;
  restarts: number;
  age: string;
  ready: string;
}

interface InfrastructureMetrics {
  totalNodes: number;
  healthyNodes: number;
  totalPods: number;
  runningPods: number;
  totalNamespaces: number;
  clusterCpuUsage: number;
  clusterMemoryUsage: number;
  storageUsage: number;
}

function InfrastructurePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'nodes' | 'pods' | 'namespaces'>('overview');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const { addToast } = useToast();

  // Mock data - replace with real API calls
  const [metrics, setMetrics] = useState<InfrastructureMetrics>({
    totalNodes: 12,
    healthyNodes: 11,
    totalPods: 247,
    runningPods: 242,
    totalNamespaces: 8,
    clusterCpuUsage: 68.4,
    clusterMemoryUsage: 72.1,
    storageUsage: 45.3
  });

  const [nodes, setNodes] = useState<K8sNode[]>([
    {
      name: 'master-1',
      status: 'ready',
      role: 'master',
      version: 'v1.28.2',
      cpu: { used: 45, total: 100 },
      memory: { used: 62, total: 100 },
      pods: { running: 12, total: 15 },
      uptime: '45d 12h',
      region: 'us-east-1a'
    },
    {
      name: 'worker-1',
      status: 'ready',
      role: 'worker',
      version: 'v1.28.2',
      cpu: { used: 78, total: 100 },
      memory: { used: 84, total: 100 },
      pods: { running: 28, total: 30 },
      uptime: '38d 6h',
      region: 'us-east-1b'
    },
    {
      name: 'worker-2',
      status: 'ready',
      role: 'worker',
      version: 'v1.28.2',
      cpu: { used: 56, total: 100 },
      memory: { used: 68, total: 100 },
      pods: { running: 22, total: 30 },
      uptime: '42d 18h',
      region: 'us-east-1c'
    },
    {
      name: 'worker-3',
      status: 'not-ready',
      role: 'worker',
      version: 'v1.28.2',
      cpu: { used: 0, total: 100 },
      memory: { used: 0, total: 100 },
      pods: { running: 0, total: 30 },
      uptime: '0h',
      region: 'us-east-1a'
    }
  ]);

  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([
    {
      name: 'default',
      status: 'active',
      pods: 12,
      services: 6,
      deployments: 4,
      cpuUsage: 45.2,
      memoryUsage: 52.1
    },
    {
      name: 'kube-system',
      status: 'active',
      pods: 18,
      services: 8,
      deployments: 6,
      cpuUsage: 23.4,
      memoryUsage: 31.7
    },
    {
      name: 'monitoring',
      status: 'active',
      pods: 8,
      services: 4,
      deployments: 3,
      cpuUsage: 67.8,
      memoryUsage: 74.2
    },
    {
      name: 'production',
      status: 'active',
      pods: 42,
      services: 15,
      deployments: 12,
      cpuUsage: 82.1,
      memoryUsage: 79.4
    }
  ]);

  const [pods, setPods] = useState<K8sPod[]>([
    {
      name: 'auth-service-7d4b8f9c5d-xk2p7',
      namespace: 'production',
      status: 'running',
      node: 'worker-1',
      cpu: 12.4,
      memory: 256,
      restarts: 0,
      age: '2d',
      ready: '1/1'
    },
    {
      name: 'api-gateway-6b9d7c8a4f-m3n8q',
      namespace: 'production',
      status: 'running',
      node: 'worker-2',
      cpu: 8.7,
      memory: 512,
      restarts: 1,
      age: '1d',
      ready: '1/1'
    },
    {
      name: 'payment-service-5c8a6d9b2e-p4r7t',
      namespace: 'production',
      status: 'pending',
      node: 'worker-3',
      cpu: 0,
      memory: 0,
      restarts: 3,
      age: '15m',
      ready: '0/1'
    }
  ]);

  useEffect(() => {
    const loadInfrastructure = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
      
      addToast({
        type: 'success',
        title: 'Infrastructure Data Loaded',
        description: 'K8s cluster metrics synchronized successfully',
        duration: 3000
      });
    };
    
    loadInfrastructure();
  }, [addToast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'running':
      case 'active':
        return 'emerald';
      case 'pending':
      case 'terminating':
        return 'amber';
      case 'not-ready':
      case 'failed':
        return 'red';
      default:
        return 'slate';
    }
  };

  const getResourceUsageColor = (usage: number) => {
    if (usage >= 90) return 'red';
    if (usage >= 80) return 'amber';
    if (usage >= 60) return 'blue';
    return 'emerald';
  };

  return (
    <div className="min-h-screen bg-kassow-dark">
      {/* Header */}
      <div className="bg-kassow-darker/80 backdrop-blur-lg border-b border-gray-700/50 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-black text-kassow-light tracking-wide">Infrastructure</h1>
              <div className="flex items-center space-x-2 text-emerald-400">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                <span className="text-sm font-semibold">Cluster Operational</span>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-kassow-darker rounded-lg p-1 border border-gray-600">
                {['overview', 'nodes', 'pods', 'namespaces'].map((view) => (
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard variant="accent" accentSide="left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-slate-400 text-sm">Cluster Nodes</h3>
                <div className="text-2xl font-bold text-white">
                  {metrics.healthyNodes}/{metrics.totalNodes}
                </div>
                <div className="text-emerald-400 text-sm">
                  {Math.round((metrics.healthyNodes / metrics.totalNodes) * 100)}% healthy
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard variant="success" accentSide="left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-slate-400 text-sm">Running Pods</h3>
                <div className="text-2xl font-bold text-white">
                  {metrics.runningPods}/{metrics.totalPods}
                </div>
                <div className="text-emerald-400 text-sm">
                  {Math.round((metrics.runningPods / metrics.totalPods) * 100)}% running
                </div>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard variant="warning" accentSide="left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-slate-400 text-sm">CPU Usage</h3>
                <div className="text-2xl font-bold text-white">{metrics.clusterCpuUsage}%</div>
                <div className="text-amber-400 text-sm">Cluster average</div>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard variant="default" accentSide="left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-slate-400 text-sm">Memory Usage</h3>
                <div className="text-2xl font-bold text-white">{metrics.clusterMemoryUsage}%</div>
                <div className="text-blue-400 text-sm">Cluster average</div>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Dynamic Content Based on Selected View */}
        {selectedView === 'overview' && (
          <DashboardGrid>
            {/* Cluster Topology */}
            <DashboardPanel variant="command-center" title="Cluster Topology">
              <DashboardCard>
                <h3 className="text-lg font-semibold text-white mb-4">Node Distribution</h3>
                <div className="space-y-4">
                  {nodes.map((node) => {
                    const statusColor = getStatusColor(node.status);
                    const cpuColor = getResourceUsageColor(node.cpu.used);
                    const memoryColor = getResourceUsageColor(node.memory.used);
                    
                    return (
                      <div key={node.name} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full bg-${statusColor}-500`}></div>
                            <div>
                              <h4 className="text-white font-semibold">{node.name}</h4>
                              <div className="flex items-center space-x-2 text-sm text-slate-400">
                                <span className="capitalize">{node.role}</span>
                                <span>•</span>
                                <span>{node.region}</span>
                                <span>•</span>
                                <span>{node.version}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-slate-400">
                            Uptime: {node.uptime}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-400">CPU</span>
                              <span className={`text-${cpuColor}-400 font-semibold`}>{node.cpu.used}%</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className={`bg-${cpuColor}-500 h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${node.cpu.used}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-400">Memory</span>
                              <span className={`text-${memoryColor}-400 font-semibold`}>{node.memory.used}%</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className={`bg-${memoryColor}-500 h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${node.memory.used}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-400">Pods</span>
                              <span className="text-blue-400 font-semibold">{node.pods.running}/{node.pods.total}</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(node.pods.running / node.pods.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DashboardCard>
            </DashboardPanel>

            {/* Namespace Overview */}
            <DashboardPanel variant="action-insights" title="Namespaces">
              <DashboardCard>
                <div className="space-y-3">
                  {namespaces.map((ns) => {
                    const statusColor = getStatusColor(ns.status);
                    const cpuColor = getResourceUsageColor(ns.cpuUsage);
                    const memoryColor = getResourceUsageColor(ns.memoryUsage);
                    
                    return (
                      <div key={ns.name} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full bg-${statusColor}-500`}></div>
                            <span className="text-white font-medium">{ns.name}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-slate-400">
                            <span>{ns.pods} pods</span>
                            <span>{ns.services} svc</span>
                            <span>{ns.deployments} deps</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-slate-400 mb-1">CPU: {ns.cpuUsage.toFixed(1)}%</div>
                            <div className="w-full bg-slate-600 rounded-full h-1.5">
                              <div 
                                className={`bg-${cpuColor}-500 h-1.5 rounded-full transition-all duration-300`}
                                style={{ width: `${ns.cpuUsage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Memory: {ns.memoryUsage.toFixed(1)}%</div>
                            <div className="w-full bg-slate-600 rounded-full h-1.5">
                              <div 
                                className={`bg-${memoryColor}-500 h-1.5 rounded-full transition-all duration-300`}
                                style={{ width: `${ns.memoryUsage}%` }}
                              ></div>
                            </div>
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

        {selectedView === 'nodes' && (
          <div className="space-y-6">
            {nodes.map((node) => {
              const statusColor = getStatusColor(node.status);
              const cpuColor = getResourceUsageColor(node.cpu.used);
              const memoryColor = getResourceUsageColor(node.memory.used);
              
              return (
                <DashboardCard key={node.name} variant="default">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Node Info */}
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-4 h-4 rounded-full bg-${statusColor}-500`}></div>
                        <div>
                          <h3 className="text-xl font-semibold text-white">{node.name}</h3>
                          <div className="text-slate-400 text-sm capitalize">{node.role} node</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Status:</span>
                          <span className={`text-${statusColor}-400 capitalize`}>{node.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Version:</span>
                          <span className="text-white">{node.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Region:</span>
                          <span className="text-white">{node.region}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Uptime:</span>
                          <span className="text-white">{node.uptime}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Resource Usage */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400">CPU Usage</span>
                          <span className={`text-${cpuColor}-400 font-semibold`}>{node.cpu.used}%</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-3">
                          <div 
                            className={`bg-${cpuColor}-500 h-3 rounded-full transition-all duration-300`}
                            style={{ width: `${node.cpu.used}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400">Memory Usage</span>
                          <span className={`text-${memoryColor}-400 font-semibold`}>{node.memory.used}%</span>
                        </div>
                        <div className="w-full bg-slate-600 rounded-full h-3">
                          <div 
                            className={`bg-${memoryColor}-500 h-3 rounded-full transition-all duration-300`}
                            style={{ width: `${node.memory.used}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pod Info */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Pod Allocation</span>
                        <span className="text-blue-400 font-semibold">{node.pods.running}/{node.pods.total}</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-3 mb-4">
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${(node.pods.running / node.pods.total) * 100}%` }}
                        ></div>
                      </div>
                      
                      <PermissionGuard permission="manage_infrastructure">
                        <div className="space-y-2">
                          <button className="w-full py-2 px-3 bg-kassow-accent text-white rounded-md hover:bg-kassow-accent-hover transition-colors text-sm">
                            Drain Node
                          </button>
                          <button className="w-full py-2 px-3 bg-slate-600 text-slate-300 rounded-md hover:bg-slate-500 transition-colors text-sm">
                            Cordon Node
                          </button>
                        </div>
                      </PermissionGuard>
                    </div>
                  </div>
                </DashboardCard>
              );
            })}
          </div>
        )}

        {selectedView === 'pods' && (
          <DashboardCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Pod Status</h3>
              <select 
                value={selectedNamespace}
                onChange={(e) => setSelectedNamespace(e.target.value)}
                className="bg-kassow-darker border border-gray-600 text-white px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-kassow-accent"
              >
                <option value="all">All Namespaces</option>
                {namespaces.map(ns => (
                  <option key={ns.name} value={ns.name}>{ns.name}</option>
                ))}
              </select>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Name</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Namespace</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Node</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">CPU</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Memory</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Restarts</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {pods
                    .filter(pod => selectedNamespace === 'all' || pod.namespace === selectedNamespace)
                    .map((pod) => {
                      const statusColor = getStatusColor(pod.status);
                      return (
                        <tr key={pod.name} className="border-b border-gray-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-2 text-white font-mono text-xs">{pod.name}</td>
                          <td className="py-3 px-2 text-slate-300">{pod.namespace}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full bg-${statusColor}-500`}></div>
                              <span className={`text-${statusColor}-400 capitalize`}>{pod.status}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-300">{pod.node}</td>
                          <td className="py-3 px-2 text-slate-300">{pod.cpu}%</td>
                          <td className="py-3 px-2 text-slate-300">{pod.memory}MB</td>
                          <td className="py-3 px-2 text-slate-300">{pod.restarts}</td>
                          <td className="py-3 px-2 text-slate-300">{pod.age}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        )}

        {selectedView === 'namespaces' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {namespaces.map((ns) => {
              const statusColor = getStatusColor(ns.status);
              const cpuColor = getResourceUsageColor(ns.cpuUsage);
              const memoryColor = getResourceUsageColor(ns.memoryUsage);
              
              return (
                <DashboardCard key={ns.name} variant="default">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full bg-${statusColor}-500`}></div>
                      <h3 className="text-xl font-semibold text-white">{ns.name}</h3>
                    </div>
                    <span className={`text-${statusColor}-400 text-sm capitalize`}>{ns.status}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{ns.pods}</div>
                      <div className="text-slate-400 text-sm">Pods</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{ns.services}</div>
                      <div className="text-slate-400 text-sm">Services</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{ns.deployments}</div>
                      <div className="text-slate-400 text-sm">Deployments</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">CPU Usage</span>
                        <span className={`text-${cpuColor}-400 font-semibold`}>{ns.cpuUsage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div 
                          className={`bg-${cpuColor}-500 h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${ns.cpuUsage}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Memory Usage</span>
                        <span className={`text-${memoryColor}-400 font-semibold`}>{ns.memoryUsage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div 
                          className={`bg-${memoryColor}-500 h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${ns.memoryUsage}%` }}
                        ></div>
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
          message="Loading infrastructure data..."
        >
          <div></div>
        </LoadingOverlay>
      )}
    </div>
  );
}

// Export with infrastructure permission protection
export default withPermissions(InfrastructurePage, {
  permissions: ['view_infrastructure'],
  redirectTo: '/unauthorized',
});