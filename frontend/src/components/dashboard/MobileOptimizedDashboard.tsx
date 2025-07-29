'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  CheckCircle, 
  Phone, 
  Terminal,
  Activity,
  Server,
  GitBranch,
  Bell,
  ChevronRight,
  XCircle,
  Zap
} from 'lucide-react';

interface MobileOptimizedDashboardProps {
  activeIncidents?: number;
  onCallEngineer?: string;
}

/**
 * Mobile-optimized dashboard for on-call engineers
 * Focuses on critical information and quick actions
 */
export function MobileOptimizedDashboard({ 
  activeIncidents = 0, 
  onCallEngineer = 'You' 
}: MobileOptimizedDashboardProps) {
  const criticalMetrics = [
    { label: 'API Latency', value: '45ms', status: 'healthy', icon: Zap },
    { label: 'Error Rate', value: '0.02%', status: 'healthy', icon: Activity },
    { label: 'CPU Usage', value: '68%', status: 'warning', icon: Server },
    { label: 'Active Alerts', value: activeIncidents.toString(), status: activeIncidents > 0 ? 'critical' : 'healthy', icon: Bell }
  ];

  const statusColors = {
    healthy: 'text-green-600 bg-green-50 dark:bg-green-950',
    warning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
    critical: 'text-red-600 bg-red-50 dark:bg-red-950'
  };

  const statusIcons = {
    healthy: CheckCircle,
    warning: AlertCircle,
    critical: XCircle
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* On-Call Status */}
      <Card className="border-primary">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              On-Call Status
            </span>
            <Badge variant="default" className="animate-pulse">ACTIVE</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {onCallEngineer} are currently on-call
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Next: Mike Johnson at 9:00 AM
          </p>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className={activeIncidents > 0 ? 'border-red-500' : 'border-green-500'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            System Status
            {activeIncidents > 0 ? (
              <Badge variant="destructive" className="animate-pulse">
                {activeIncidents} INCIDENT{activeIncidents > 1 ? 'S' : ''}
              </Badge>
            ) : (
              <Badge variant="default" className="bg-green-600">
                ALL CLEAR
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        {activeIncidents > 0 && (
          <CardContent>
            <Button className="w-full" variant="destructive" size="sm">
              View Active Incidents
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Critical Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {criticalMetrics.map((metric) => {
          const StatusIcon = statusIcons[metric.status as keyof typeof statusIcons];
          return (
            <Card key={metric.label} className={`${statusColors[metric.status as keyof typeof statusColors]} border-0`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium opacity-80">{metric.label}</p>
                    <p className="text-xl font-bold mt-1">{metric.value}</p>
                  </div>
                  <StatusIcon className="h-5 w-5 opacity-60" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <Terminal className="h-4 w-4" />
            Open Terminal
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <GitBranch className="h-4 w-4" />
            View Deployments
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <Activity className="h-4 w-4" />
            System Metrics
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <Phone className="h-4 w-4" />
            Page Team Lead
          </Button>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Deployment Successful</p>
                <p className="text-xs text-muted-foreground">Frontend v2.1.0 • 5m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium">High Memory Usage</p>
                <p className="text-xs text-muted-foreground">Worker nodes • 15m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Auto-scaling Triggered</p>
                <p className="text-xs text-muted-foreground">Added 2 nodes • 1h ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}