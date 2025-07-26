/**
 * Dashboard Components Index
 * 
 * Central export file for all dashboard components.
 * Provides clean imports for the OpsSight DevOps dashboard.
 */

// Layout Components
export { DashboardShell } from './DashboardShell';
export { DashboardLayout } from './DashboardLayout';

// Core Dashboard Components
export { MetricsOverview } from './MetricsOverview';
export { PipelineStatus } from './PipelineStatus';
export { RealTimeAlertsPanel } from './RealTimeAlertsPanel';
export { ResourceMonitor } from './ResourceMonitor';
export { GitActivityFeed } from './GitActivityFeed';

// Panel Components
export { default as AlertsPanel } from './AlertsPanel';
export { default as SystemPulsePanel } from './SystemPulsePanel';
export { default as CommandCenterPanel } from './CommandCenterPanel';
export { default as ActionInsightsPanel } from './ActionInsightsPanel';

// Sub-components
export { KubernetesStatusPanel } from './KubernetesStatusPanel';
export { PipelineExecutionView } from './PipelineExecutionView';
export { PipelineHealthDashboard } from './PipelineHealthDashboard';
export { ResourceUsagePanel } from './ResourceUsagePanel';
export { InfrastructurePanel } from './InfrastructurePanel';
export { TeamsPanel } from './TeamsPanel';
export { AutomationCoveragePanel } from './AutomationCoveragePanel';

// Utility Components
export { TeamSwitcher } from './TeamSwitcher';
export { TopNavigation } from './TopNavigation';
export { EventsTimeline } from './EventsTimeline';
export { MonitoringSessionControl } from './MonitoringSessionControl';
export { ContainerLogsViewer } from './ContainerLogsViewer';
export { PodDetailView } from './PodDetailView';

// Lazy-loaded Components
export { LazyDashboardComponents } from './LazyDashboardComponents';