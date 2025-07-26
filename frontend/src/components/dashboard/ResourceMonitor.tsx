'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  Database,
  Network,
  Cloud,
  Container,
  Box,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Maximize2
} from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  type: 'node' | 'pod' | 'container' | 'database' | 'cache';
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  namespace?: string;
  metrics: {
    cpu: { usage: number; limit: number; unit: string };
    memory: { usage: number; limit: number; unit: string };
    disk?: { usage: number; limit: number; unit: string };
    network?: { in: number; out: number; unit: string };
  };
  replicas?: { current: number; desired: number };
  uptime?: string;
  lastUpdated: Date;
}

interface ClusterSummary {
  nodes: { total: number; ready: number };
  pods: { total: number; running: number; pending: number; failed: number };
  cpu: { used: number; total: number };
  memory: { used: number; total: number };
  storage: { used: number; total: number };
}

export function ResourceMonitor() {
  const [resources, setResources] = useState<Resource[]>(mockResources);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'node' | 'pod' | 'container'>('all');

  // WebSocket for real-time metrics
  const { subscribe, connectionStatus } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
    autoConnect: true
  });

  useEffect(() => {
    const unsubscribe = subscribe('resource_metrics', (message) => {
      setResources(prev => prev.map(resource => 
        resource.id === message.payload.resource_id 
          ? { ...resource, metrics: message.payload.metrics, lastUpdated: new Date() }
          : resource
      ));
    });

    return unsubscribe;
  }, [subscribe]);

  const clusterSummary: ClusterSummary = {
    nodes: {
      total: resources.filter(r => r.type === 'node').length,
      ready: resources.filter(r => r.type === 'node' && r.status === 'healthy').length
    },
    pods: {
      total: resources.filter(r => r.type === 'pod').length,
      running: resources.filter(r => r.type === 'pod' && r.status === 'healthy').length,
      pending: resources.filter(r => r.type === 'pod' && r.status === 'warning').length,
      failed: resources.filter(r => r.type === 'pod' && r.status === 'critical').length
    },
    cpu: {
      used: resources.reduce((sum, r) => sum + (r.metrics.cpu.usage || 0), 0) / resources.length,
      total: 100
    },
    memory: {
      used: resources.reduce((sum, r) => sum + (r.metrics.memory.usage || 0), 0) / resources.length,
      total: 100
    },
    storage: {
      used: 65,
      total: 100
    }
  };

  const filteredResources = resources.filter(resource => {
    if (filter === 'all') return true;
    return resource.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resource Monitor</h2>
          <p className="text-muted-foreground">Kubernetes cluster and infrastructure status</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cluster Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Nodes</span>
              <Server className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">
              {clusterSummary.nodes.ready}/{clusterSummary.nodes.total}
            </div>
            <div className="text-xs text-muted-foreground">Ready</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pods</span>
              <Box className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold">
              {clusterSummary.pods.running}/{clusterSummary.pods.total}
            </div>
            <div className="text-xs text-muted-foreground">Running</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">CPU</span>
              <Cpu className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{clusterSummary.cpu.used.toFixed(0)}%</div>
            <Progress value={clusterSummary.cpu.used} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Memory</span>
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{clusterSummary.memory.used.toFixed(0)}%</div>
            <Progress value={clusterSummary.memory.used} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Storage</span>
              <HardDrive className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{clusterSummary.storage.used}%</div>
            <Progress value={clusterSummary.storage.used} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b">
        {['all', 'node', 'pod', 'container'].map((tab) => (
          <button
            key={tab}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              filter === tab 
                ? "border-blue-500 text-blue-600" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setFilter(tab as any)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}s
          </button>
        ))}
      </div>

      {/* Resources Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => (
            <ResourceCard 
              key={resource.id} 
              resource={resource}
              selected={selectedResource === resource.id}
              onClick={() => setSelectedResource(resource.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredResources.map((resource) => (
            <ResourceListItem 
              key={resource.id} 
              resource={resource}
              selected={selectedResource === resource.id}
              onClick={() => setSelectedResource(resource.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ 
  resource, 
  selected, 
  onClick 
}: { 
  resource: Resource; 
  selected: boolean;
  onClick: () => void;
}) {
  const typeIcons = {
    node: Server,
    pod: Box,
    container: Container,
    database: Database,
    cache: Database
  };

  const statusConfig = {
    healthy: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
    warning: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Warning' },
    critical: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
    unknown: { color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Unknown' }
  };

  const Icon = typeIcons[resource.type];
  const status = statusConfig[resource.status];

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg",
        selected && "ring-2 ring-blue-500"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", status.bg)}>
              <Icon className={cn("h-5 w-5", status.color)} />
            </div>
            <div>
              <h3 className="font-semibold">{resource.name}</h3>
              {resource.namespace && (
                <p className="text-xs text-muted-foreground">{resource.namespace}</p>
              )}
            </div>
          </div>
          <Badge className={cn(status.bg, status.color)}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* CPU Usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              CPU
            </span>
            <span className="font-mono">
              {resource.metrics.cpu.usage}/{resource.metrics.cpu.limit}{resource.metrics.cpu.unit}
            </span>
          </div>
          <Progress 
            value={(resource.metrics.cpu.usage / resource.metrics.cpu.limit) * 100} 
            className="h-2"
          />
        </div>

        {/* Memory Usage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Memory
            </span>
            <span className="font-mono">
              {resource.metrics.memory.usage}/{resource.metrics.memory.limit}{resource.metrics.memory.unit}
            </span>
          </div>
          <Progress 
            value={(resource.metrics.memory.usage / resource.metrics.memory.limit) * 100} 
            className="h-2"
          />
        </div>

        {/* Replicas */}
        {resource.replicas && (
          <div className="flex items-center justify-between text-sm">
            <span>Replicas</span>
            <span className="font-mono">
              {resource.replicas.current}/{resource.replicas.desired}
            </span>
          </div>
        )}

        {/* Uptime */}
        {resource.uptime && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Uptime</span>
            <span>{resource.uptime}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResourceListItem({ 
  resource, 
  selected, 
  onClick 
}: { 
  resource: Resource; 
  selected: boolean;
  onClick: () => void;
}) {
  const typeIcons = {
    node: Server,
    pod: Box,
    container: Container,
    database: Database,
    cache: Database
  };

  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500' },
    warning: { icon: AlertCircle, color: 'text-yellow-500' },
    critical: { icon: AlertCircle, color: 'text-red-500' },
    unknown: { icon: AlertCircle, color: 'text-gray-500' }
  };

  const TypeIcon = typeIcons[resource.type];
  const StatusIcon = statusConfig[resource.status].icon;

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-blue-500"
      )}
      onClick={onClick}
    >
      <TypeIcon className="h-5 w-5 text-gray-500" />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{resource.name}</h4>
          {resource.namespace && (
            <span className="text-xs text-muted-foreground">({resource.namespace})</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <div className="font-mono">{resource.metrics.cpu.usage}%</div>
          <div className="text-xs text-muted-foreground">CPU</div>
        </div>
        <div className="text-right">
          <div className="font-mono">{resource.metrics.memory.usage}%</div>
          <div className="text-xs text-muted-foreground">Memory</div>
        </div>
      </div>

      <StatusIcon className={cn("h-5 w-5", statusConfig[resource.status].color)} />
    </div>
  );
}

// Mock data - replace with real data
const mockResources: Resource[] = [
  {
    id: 'node-1',
    name: 'k8s-master-01',
    type: 'node',
    status: 'healthy',
    metrics: {
      cpu: { usage: 45, limit: 100, unit: '%' },
      memory: { usage: 62, limit: 100, unit: '%' },
      disk: { usage: 70, limit: 100, unit: '%' }
    },
    uptime: '15 days',
    lastUpdated: new Date()
  },
  {
    id: 'node-2',
    name: 'k8s-worker-01',
    type: 'node',
    status: 'warning',
    metrics: {
      cpu: { usage: 82, limit: 100, unit: '%' },
      memory: { usage: 78, limit: 100, unit: '%' },
      disk: { usage: 85, limit: 100, unit: '%' }
    },
    uptime: '15 days',
    lastUpdated: new Date()
  },
  {
    id: 'pod-1',
    name: 'api-server-7d9c5c5d9-xvlbz',
    type: 'pod',
    namespace: 'production',
    status: 'healthy',
    metrics: {
      cpu: { usage: 250, limit: 500, unit: 'm' },
      memory: { usage: 512, limit: 1024, unit: 'Mi' }
    },
    replicas: { current: 3, desired: 3 },
    uptime: '2 days',
    lastUpdated: new Date()
  },
  {
    id: 'pod-2',
    name: 'frontend-6f7d8c7d9-abc123',
    type: 'pod',
    namespace: 'production',
    status: 'healthy',
    metrics: {
      cpu: { usage: 100, limit: 200, unit: 'm' },
      memory: { usage: 256, limit: 512, unit: 'Mi' }
    },
    replicas: { current: 2, desired: 2 },
    uptime: '5 hours',
    lastUpdated: new Date()
  },
  {
    id: 'container-1',
    name: 'nginx',
    type: 'container',
    namespace: 'ingress',
    status: 'healthy',
    metrics: {
      cpu: { usage: 50, limit: 100, unit: 'm' },
      memory: { usage: 128, limit: 256, unit: 'Mi' }
    },
    uptime: '7 days',
    lastUpdated: new Date()
  },
  {
    id: 'db-1',
    name: 'postgres-primary',
    type: 'database',
    namespace: 'database',
    status: 'critical',
    metrics: {
      cpu: { usage: 95, limit: 100, unit: '%' },
      memory: { usage: 90, limit: 100, unit: '%' },
      disk: { usage: 88, limit: 100, unit: '%' }
    },
    uptime: '30 days',
    lastUpdated: new Date()
  }
];