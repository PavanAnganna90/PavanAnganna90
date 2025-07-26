'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  GitBranch, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Terminal,
  GitCommit,
  User
} from 'lucide-react';

interface Pipeline {
  id: string;
  name: string;
  branch: string;
  status: 'running' | 'success' | 'failed' | 'pending' | 'cancelled';
  progress: number;
  stages: Stage[];
  author: string;
  commitMessage: string;
  commitHash: string;
  startTime: string;
  duration?: number;
  estimatedCompletion?: string;
}

interface Stage {
  name: string;
  status: 'running' | 'success' | 'failed' | 'pending' | 'skipped';
  duration?: number;
  jobs?: Job[];
}

interface Job {
  name: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  logs?: string[];
}

export function PipelineStatus() {
  const [pipelines, setPipelines] = useState<Pipeline[]>(mockPipelines);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const { subscribe, connectionStatus } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
    autoConnect: true
  });

  useEffect(() => {
    // Subscribe to pipeline updates
    const unsubscribe = subscribe('pipeline_update', (message) => {
      setPipelines(prev => {
        const updated = [...prev];
        const index = updated.findIndex(p => p.id === message.payload.pipeline_id);
        if (index !== -1) {
          // Update existing pipeline
          updated[index] = {
            ...updated[index],
            status: message.payload.status,
            progress: message.payload.progress || updated[index].progress
          };
        }
        return updated;
      });
    });

    return unsubscribe;
  }, [subscribe]);

  const statusConfig = {
    running: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Running' },
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Success' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
    pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Pending' },
    cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Cancelled' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline Status</h2>
          <p className="text-muted-foreground">Monitor CI/CD pipeline execution</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </Badge>
          <Button size="sm" variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Pipeline List */}
      <div className="space-y-4">
        {pipelines.map((pipeline) => (
          <Card 
            key={pipeline.id}
            className={cn(
              "transition-all duration-200 hover:shadow-lg cursor-pointer",
              selectedPipeline === pipeline.id && "ring-2 ring-blue-500"
            )}
            onClick={() => setSelectedPipeline(pipeline.id)}
          >
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Pipeline Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{pipeline.name}</h3>
                      <Badge 
                        className={cn(
                          statusConfig[pipeline.status].bg,
                          statusConfig[pipeline.status].color
                        )}
                      >
                        {statusConfig[pipeline.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        {pipeline.branch}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitCommit className="h-4 w-4" />
                        {pipeline.commitHash}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {pipeline.author}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pipeline.status === 'running' && (
                      <Button size="sm" variant="ghost">
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {(pipeline.status === 'failed' || pipeline.status === 'cancelled') && (
                      <Button size="sm" variant="ghost">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Terminal className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Commit Message */}
                <p className="text-sm text-muted-foreground">{pipeline.commitMessage}</p>

                {/* Progress Bar */}
                {pipeline.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span>{pipeline.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pipeline.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stages */}
                <div className="flex items-center gap-2">
                  {pipeline.stages.map((stage, index) => (
                    <React.Fragment key={stage.name}>
                      <StageIndicator stage={stage} />
                      {index < pipeline.stages.length - 1 && (
                        <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Started {pipeline.startTime}</span>
                  {pipeline.duration && (
                    <span>Duration: {formatDuration(pipeline.duration)}</span>
                  )}
                  {pipeline.estimatedCompletion && pipeline.status === 'running' && (
                    <span>ETA: {pipeline.estimatedCompletion}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {pipelines.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pipelines running</h3>
            <p className="text-muted-foreground text-center">
              Your CI/CD pipelines will appear here when triggered
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StageIndicator({ stage }: { stage: Stage }) {
  const statusConfig = {
    running: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500' },
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500' },
    pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-300' },
    skipped: { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-300' }
  };

  const config = statusConfig[stage.status];
  const Icon = config.icon;

  return (
    <div className="relative group">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center",
        stage.status === 'pending' || stage.status === 'skipped' 
          ? 'bg-gray-200 dark:bg-gray-700' 
          : config.bg + '/20'
      )}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {stage.name}
          {stage.duration && ` (${formatDuration(stage.duration)})`}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Mock data - replace with real data
const mockPipelines: Pipeline[] = [
  {
    id: '1',
    name: 'Frontend Build & Deploy',
    branch: 'main',
    status: 'running',
    progress: 65,
    stages: [
      { name: 'Checkout', status: 'success', duration: 12 },
      { name: 'Install', status: 'success', duration: 45 },
      { name: 'Build', status: 'running' },
      { name: 'Test', status: 'pending' },
      { name: 'Deploy', status: 'pending' }
    ],
    author: 'sarah.dev',
    commitMessage: 'feat: Add real-time monitoring dashboard',
    commitHash: 'a1b2c3d',
    startTime: '5 minutes ago',
    duration: 180,
    estimatedCompletion: '2 minutes'
  },
  {
    id: '2',
    name: 'API Service Update',
    branch: 'feature/auth-improvements',
    status: 'success',
    progress: 100,
    stages: [
      { name: 'Checkout', status: 'success', duration: 10 },
      { name: 'Build', status: 'success', duration: 120 },
      { name: 'Test', status: 'success', duration: 180 },
      { name: 'Deploy', status: 'success', duration: 45 }
    ],
    author: 'mike.backend',
    commitMessage: 'fix: Resolve authentication token expiry issue',
    commitHash: 'e4f5g6h',
    startTime: '15 minutes ago',
    duration: 355
  },
  {
    id: '3',
    name: 'Infrastructure Update',
    branch: 'infra/k8s-upgrade',
    status: 'failed',
    progress: 40,
    stages: [
      { name: 'Validate', status: 'success', duration: 20 },
      { name: 'Plan', status: 'success', duration: 60 },
      { name: 'Apply', status: 'failed', duration: 90 },
      { name: 'Verify', status: 'skipped' }
    ],
    author: 'alex.ops',
    commitMessage: 'chore: Upgrade Kubernetes to v1.28',
    commitHash: 'i7j8k9l',
    startTime: '1 hour ago',
    duration: 170
  }
];