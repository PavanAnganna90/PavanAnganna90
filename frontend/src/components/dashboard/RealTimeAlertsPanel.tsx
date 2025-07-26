'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Bell,
  BellOff,
  Filter,
  MoreVertical,
  ExternalLink,
  Clock,
  TrendingUp,
  Shield,
  Server,
  Database,
  Network,
  Cpu,
  HardDrive
} from 'lucide-react';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  assignee?: string;
  metrics?: {
    current: number;
    threshold: number;
    unit: string;
  };
  tags: string[];
  relatedIncidents?: number;
}

interface AlertGroup {
  category: string;
  icon: React.ElementType;
  color: string;
  alerts: Alert[];
}

export function RealTimeAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [showResolved, setShowResolved] = useState(false);

  // WebSocket for real-time alerts
  const { subscribe, connectionStatus } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
    autoConnect: true
  });

  useEffect(() => {
    const unsubscribe = subscribe('alert', (message) => {
      if (message.type === 'alert_new') {
        setAlerts(prev => [message.payload as Alert, ...prev]);
      } else if (message.type === 'alert_update') {
        setAlerts(prev => prev.map(alert => 
          alert.id === message.payload.id ? { ...alert, ...message.payload } : alert
        ));
      }
    });

    return unsubscribe;
  }, [subscribe]);

  const severityConfig = {
    critical: { 
      icon: AlertCircle, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10',
      badge: 'destructive' as const
    },
    warning: { 
      icon: AlertTriangle, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10',
      badge: 'warning' as const
    },
    info: { 
      icon: Info, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      badge: 'default' as const
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (!showResolved && alert.status === 'resolved') return false;
    if (filter === 'all') return true;
    return alert.severity === filter;
  });

  // Group alerts by category
  const groupedAlerts: AlertGroup[] = [
    {
      category: 'Infrastructure',
      icon: Server,
      color: 'text-purple-500',
      alerts: filteredAlerts.filter(a => ['server', 'network', 'storage'].includes(a.source))
    },
    {
      category: 'Application',
      icon: Cpu,
      color: 'text-blue-500',
      alerts: filteredAlerts.filter(a => ['api', 'frontend', 'backend'].includes(a.source))
    },
    {
      category: 'Database',
      icon: Database,
      color: 'text-green-500',
      alerts: filteredAlerts.filter(a => ['database', 'cache'].includes(a.source))
    },
    {
      category: 'Security',
      icon: Shield,
      color: 'text-red-500',
      alerts: filteredAlerts.filter(a => a.tags.includes('security'))
    }
  ].filter(group => group.alerts.length > 0);

  const alertCounts = {
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    warning: alerts.filter(a => a.severity === 'warning' && a.status === 'active').length,
    info: alerts.filter(a => a.severity === 'info' && a.status === 'active').length,
    total: alerts.filter(a => a.status === 'active').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alerts & Incidents</h2>
          <p className="text-muted-foreground">Real-time system alerts and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </Badge>
          <Button size="sm" variant="outline">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all",
            filter === 'all' && "ring-2 ring-blue-500"
          )}
          onClick={() => setFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-2xl font-bold">{alertCounts.total}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all",
            filter === 'critical' && "ring-2 ring-red-500"
          )}
          onClick={() => setFilter('critical')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-500">{alertCounts.critical}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all",
            filter === 'warning' && "ring-2 ring-yellow-500"
          )}
          onClick={() => setFilter('warning')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warning</p>
                <p className="text-2xl font-bold text-yellow-500">{alertCounts.warning}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all",
            filter === 'info' && "ring-2 ring-blue-500"
          )}
          onClick={() => setFilter('info')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Info</p>
                <p className="text-2xl font-bold text-blue-500">{alertCounts.info}</p>
              </div>
              <Info className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={showResolved ? 'default' : 'outline'}
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide' : 'Show'} Resolved
          </Button>
        </div>
      </div>

      {/* Alert Groups */}
      <div className="space-y-4">
        {groupedAlerts.map((group) => (
          <Card key={group.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <group.icon className={cn("h-5 w-5", group.color)} />
                {group.category}
                <Badge variant="secondary" className="ml-auto">
                  {group.alerts.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All systems operational</h3>
            <p className="text-muted-foreground text-center">
              No active alerts at the moment
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const severityConfig = {
    critical: { 
      icon: AlertCircle, 
      color: 'text-red-500', 
      bg: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    },
    warning: { 
      icon: AlertTriangle, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20'
    },
    info: { 
      icon: Info, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    }
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all hover:shadow-md",
      config.borderColor,
      alert.status === 'resolved' && "opacity-60"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">{alert.title}</h4>
              <p className="text-sm text-muted-foreground">{alert.description}</p>
            </div>
            <Button size="sm" variant="ghost">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>

          {alert.metrics && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <span className="font-mono">
                {alert.metrics.current}{alert.metrics.unit} / {alert.metrics.threshold}{alert.metrics.unit}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
            </span>
            <span>Source: {alert.source}</span>
            {alert.assignee && (
              <span>Assigned to: {alert.assignee}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {alert.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {alert.relatedIncidents && alert.relatedIncidents > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{alert.relatedIncidents} related
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock data - replace with real data
const mockAlerts: Alert[] = [
  {
    id: '1',
    severity: 'critical',
    title: 'High Memory Usage on Production Server',
    description: 'Memory usage has exceeded 90% threshold on prod-api-01',
    source: 'server',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'active',
    metrics: {
      current: 92,
      threshold: 90,
      unit: '%'
    },
    tags: ['production', 'memory', 'performance'],
    relatedIncidents: 2
  },
  {
    id: '2',
    severity: 'warning',
    title: 'Slow Database Queries Detected',
    description: 'Multiple queries exceeding 5s execution time',
    source: 'database',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'acknowledged',
    assignee: 'john.doe',
    metrics: {
      current: 6.2,
      threshold: 5,
      unit: 's'
    },
    tags: ['database', 'performance', 'postgresql']
  },
  {
    id: '3',
    severity: 'info',
    title: 'Scheduled Maintenance Reminder',
    description: 'Database maintenance window starts in 2 hours',
    source: 'system',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'active',
    tags: ['maintenance', 'scheduled']
  },
  {
    id: '4',
    severity: 'critical',
    title: 'SSL Certificate Expiring Soon',
    description: 'SSL certificate for api.domain.com expires in 3 days',
    source: 'security',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    status: 'active',
    tags: ['security', 'ssl', 'certificate'],
    assignee: 'security-team'
  }
];