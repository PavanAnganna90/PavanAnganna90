# OpsSight Dashboard Components

A comprehensive set of production-ready DevOps dashboard components built with Next.js 15, Tailwind CSS, and ShadCN UI.

## 🚀 Quick Start

```tsx
import { DashboardShell, MetricsOverview, PipelineStatus } from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <DashboardShell>
      <MetricsOverview />
      <PipelineStatus />
    </DashboardShell>
  );
}
```

## 📦 Core Components

### DashboardShell
The main layout wrapper providing responsive sidebar navigation and header.

**Features:**
- Collapsible sidebar with navigation
- Mobile-responsive design
- Quick action buttons
- Breadcrumb support

**Usage:**
```tsx
<DashboardShell>
  {/* Your dashboard content */}
</DashboardShell>
```

### MetricsOverview
Displays key performance indicators and system health metrics.

**Features:**
- Real-time metric updates
- Sparkline charts
- Service health monitoring
- Quick stats overview

**Usage:**
```tsx
<MetricsOverview />
```

### PipelineStatus
Monitor CI/CD pipeline execution in real-time.

**Features:**
- Live pipeline progress
- Stage visualization
- Build history
- WebSocket updates

**Usage:**
```tsx
<PipelineStatus />
```

### RealTimeAlertsPanel
Comprehensive alert management with real-time updates.

**Features:**
- Alert categorization
- Severity filtering
- Real-time notifications
- Alert statistics

**Usage:**
```tsx
<RealTimeAlertsPanel />
```

### ResourceMonitor
Kubernetes and infrastructure resource monitoring.

**Features:**
- Node/Pod/Container status
- Resource usage visualization
- Cluster summary
- Grid/List view toggle

**Usage:**
```tsx
<ResourceMonitor />
```

### GitActivityFeed
Track repository activity and team contributions.

**Features:**
- Commit/PR/Merge tracking
- Contributor statistics
- Activity timeline
- Repository stats

**Usage:**
```tsx
<GitActivityFeed />
```

## 🎨 Theming

Import the dashboard theme CSS for proper styling:

```tsx
// In your layout or _app.tsx
import '@/styles/dashboard-theme.css';
```

### CSS Variables
The dashboard uses CSS variables for easy theming:

```css
--dashboard-bg: Background color
--dashboard-card: Card background
--dashboard-border: Border color
--status-healthy: Success state color
--status-warning: Warning state color
--status-critical: Error state color
```

## 🔌 WebSocket Integration

Components support real-time updates via WebSocket:

```tsx
// Configure WebSocket URL
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

// Components automatically connect and subscribe to relevant events
<PipelineStatus /> // Subscribes to 'pipeline_update'
<RealTimeAlertsPanel /> // Subscribes to 'alert'
<ResourceMonitor /> // Subscribes to 'resource_metrics'
```

## 📊 Data Structure

### Pipeline Data
```typescript
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
```

### Alert Data
```typescript
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
```

### Resource Data
```typescript
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
```

## 🎯 Best Practices

1. **Performance**: Components use React.memo and lazy loading for optimal performance
2. **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels
3. **Responsive**: Mobile-first design with breakpoints for all screen sizes
4. **Error Handling**: Graceful error states and loading indicators
5. **Type Safety**: Full TypeScript support with proper interfaces

## 🧪 Testing

```bash
# Run component tests
npm test -- --testPathPattern=dashboard

# Test specific component
npm test -- MetricsOverview.test.tsx
```

## 📝 Examples

### Complete Dashboard Page
```tsx
import { DashboardShell, MetricsOverview, PipelineStatus, RealTimeAlertsPanel } from '@/components/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

export default function DashboardPage() {
  return (
    <DashboardShell>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <MetricsOverview />
        </TabsContent>
        
        <TabsContent value="pipelines">
          <PipelineStatus />
        </TabsContent>
        
        <TabsContent value="alerts">
          <RealTimeAlertsPanel />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
```

### Custom Metric Card
```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { Cpu } from 'lucide-react';

<MetricCard
  title="CPU Usage"
  value="65%"
  change="-7% from last hour"
  changeType="positive"
  icon={Cpu}
/>
```

### Real-time Updates
```tsx
import { useWebSocket } from '@/hooks/useWebSocket';

function CustomDashboard() {
  const { subscribe, connectionStatus } = useWebSocket({
    url: 'ws://localhost:8000/ws',
    autoConnect: true
  });

  useEffect(() => {
    const unsubscribe = subscribe('custom_event', (message) => {
      // Handle real-time updates
      console.log('Received:', message);
    });

    return unsubscribe;
  }, [subscribe]);

  return (
    <div>
      <Badge>{connectionStatus}</Badge>
      {/* Your dashboard content */}
    </div>
  );
}
```

## 🤝 Contributing

1. Follow the existing component patterns
2. Ensure proper TypeScript types
3. Add unit tests for new components
4. Update documentation
5. Test responsive design

## 📄 License

MIT - See LICENSE file for details