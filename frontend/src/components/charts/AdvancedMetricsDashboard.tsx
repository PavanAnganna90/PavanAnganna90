/**
 * Advanced Metrics Dashboard Component
 * 
 * A comprehensive, real-time metrics visualization dashboard with:
 * - Multi-dimensional data visualization
 * - Interactive filtering and drilling down
 * - Real-time updates with WebSocket integration
 * - Advanced chart types (heatmaps, treemaps, sankey diagrams)
 * - Performance optimization with virtualization
 * - Accessibility and keyboard navigation
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Treemap,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { format, subDays, parseISO, startOfHour, endOfHour } from 'date-fns';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { PinchZoomContainer } from '@/components/touch';

// Types
interface MetricData {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  response_time: number;
  error_rate: number;
  request_count: number;
  active_users: number;
  deployment_frequency: number;
  build_success_rate: number;
  test_coverage: number;
  service_health: number;
  alerts_count: number;
  sla_compliance: number;
}

interface ServiceMetrics {
  service_name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  response_time: number;
  error_rate: number;
  throughput: number;
  cpu_usage: number;
  memory_usage: number;
  last_deployment: string;
  uptime: number;
}

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
  incidents: number;
}

interface AdvancedMetricsDashboardProps {
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d';
  refreshInterval?: number;
  enableRealTime?: boolean;
  selectedMetrics?: string[];
  onMetricSelect?: (metric: string) => void;
  onDrillDown?: (filters: Record<string, any>) => void;
  className?: string;
}

const METRIC_CONFIGS = {
  cpu_usage: { name: 'CPU Usage', unit: '%', color: '#ff6b6b', format: (v: number) => `${v.toFixed(1)}%` },
  memory_usage: { name: 'Memory Usage', unit: '%', color: '#4ecdc4', format: (v: number) => `${v.toFixed(1)}%` },
  disk_usage: { name: 'Disk Usage', unit: '%', color: '#45b7d1', format: (v: number) => `${v.toFixed(1)}%` },
  response_time: { name: 'Response Time', unit: 'ms', color: '#f9ca24', format: (v: number) => `${v.toFixed(0)}ms` },
  error_rate: { name: 'Error Rate', unit: '%', color: '#f0932b', format: (v: number) => `${v.toFixed(2)}%` },
  request_count: { name: 'Requests/min', unit: 'req', color: '#6c5ce7', format: (v: number) => `${v.toFixed(0)}` },
  active_users: { name: 'Active Users', unit: 'users', color: '#a29bfe', format: (v: number) => `${v.toFixed(0)}` },
  sla_compliance: { name: 'SLA Compliance', unit: '%', color: '#00b894', format: (v: number) => `${v.toFixed(2)}%` },
};

const CHART_TYPES = {
  line: 'Line Chart',
  area: 'Area Chart',
  bar: 'Bar Chart',
  scatter: 'Scatter Plot',
  heatmap: 'Heatmap',
  treemap: 'Treemap',
  radial: 'Radial Chart',
  composed: 'Composed Chart',
} as const;

type ChartType = keyof typeof CHART_TYPES;

/**
 * Advanced Metrics Dashboard Component
 */
export const AdvancedMetricsDashboard: React.FC<AdvancedMetricsDashboardProps> = ({
  timeRange = '24h',
  refreshInterval = 30000,
  enableRealTime = true,
  selectedMetrics = ['cpu_usage', 'memory_usage', 'response_time', 'error_rate'],
  onMetricSelect,
  onDrillDown,
  className = '',
}) => {
  // State management
  const [data, setData] = useState<MetricData[]>([]);
  const [serviceData, setServiceData] = useState<ServiceMetrics[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<ChartType>('composed');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'correlation'>('overview');
  const [drillDownFilters, setDrillDownFilters] = useState<Record<string, any>>({});
  const [highlightedMetric, setHighlightedMetric] = useState<string | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  const dashboardRef = useRef<HTMLDivElement>(null);

  // Real-time data integration
  const { data: realTimeData, isConnected, connectionStatus } = useRealTimeData({
    endpoint: '/api/metrics/realtime',
    enabled: enableRealTime,
    interval: refreshInterval,
  });

  // Keyboard navigation
  const { containerRef, focusNext, focusPrevious, focusFirst } = useKeyboardNavigation({
    enableArrowKeys: true,
    enableTabNavigation: true,
    shortcuts: {
      'Ctrl+1': () => setActiveChart('line'),
      'Ctrl+2': () => setActiveChart('area'),
      'Ctrl+3': () => setActiveChart('bar'),
      'Ctrl+4': () => setActiveChart('heatmap'),
      'Ctrl+r': () => handleRefresh(),
      'Ctrl+f': () => focusFirst(),
    },
  });

  // Data processing
  const processedData = useMemo(() => {
    if (!data.length) return [];

    return data.map(item => ({
      ...item,
      timestamp_formatted: format(parseISO(item.timestamp), 'HH:mm'),
      cpu_threshold: item.cpu_usage > 80 ? 'high' : item.cpu_usage > 60 ? 'medium' : 'low',
      memory_threshold: item.memory_usage > 85 ? 'high' : item.memory_usage > 70 ? 'medium' : 'low',
      health_score: calculateHealthScore(item),
    }));
  }, [data]);

  // Correlation analysis
  const correlationData = useMemo(() => {
    if (processedData.length < 2) return [];
    
    return selectedMetrics.map(metric => ({
      metric,
      correlations: selectedMetrics.map(otherMetric => ({
        metric: otherMetric,
        correlation: calculateCorrelation(processedData, metric, otherMetric),
      })).filter(c => c.metric !== metric),
    }));
  }, [processedData, selectedMetrics]);

  // Anomaly detection
  const anomalies = useMemo(() => {
    return detectAnomalies(processedData, selectedMetrics);
  }, [processedData, selectedMetrics]);

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsResponse, servicesResponse] = await Promise.all([
        fetch(`/api/metrics?timeRange=${selectedTimeRange}&metrics=${selectedMetrics.join(',')}`),
        fetch('/api/metrics/services'),
      ]);

      if (!metricsResponse.ok || !servicesResponse.ok) {
        throw new Error('Failed to fetch metrics data');
      }

      const [metricsData, servicesData] = await Promise.all([
        metricsResponse.json(),
        servicesResponse.json(),
      ]);

      setData(metricsData.data || []);
      setServiceData(servicesData.data || []);
      generateHeatmapData(metricsData.data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, selectedMetrics]);

  // Real-time data updates
  useEffect(() => {
    if (realTimeData && enableRealTime) {
      setData(prevData => {
        const newData = [...prevData, realTimeData].slice(-100); // Keep last 100 points
        return newData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      });
    }
  }, [realTimeData, enableRealTime]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!enableRealTime && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [enableRealTime, refreshInterval, fetchData]);

  // Helper functions
  function calculateHealthScore(item: MetricData): number {
    const weights = {
      cpu_usage: 0.2,
      memory_usage: 0.2,
      response_time: 0.3,
      error_rate: 0.3,
    };

    const scores = {
      cpu_usage: Math.max(0, 100 - item.cpu_usage),
      memory_usage: Math.max(0, 100 - item.memory_usage),
      response_time: Math.max(0, 100 - (item.response_time / 10)), // Normalize to 0-100
      error_rate: Math.max(0, 100 - (item.error_rate * 10)),
    };

    return Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key as keyof typeof scores] * weight);
    }, 0);
  }

  function calculateCorrelation(data: any[], metric1: string, metric2: string): number {
    const values1 = data.map(d => d[metric1]).filter(v => typeof v === 'number');
    const values2 = data.map(d => d[metric2]).filter(v => typeof v === 'number');
    
    if (values1.length !== values2.length || values1.length < 2) return 0;

    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

    const numerator = values1.reduce((sum, val1, i) => {
      return sum + (val1 - mean1) * (values2[i] - mean2);
    }, 0);

    const denominator1 = Math.sqrt(values1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0));
    const denominator2 = Math.sqrt(values2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0));

    if (denominator1 === 0 || denominator2 === 0) return 0;
    return numerator / (denominator1 * denominator2);
  }

  function detectAnomalies(data: any[], metrics: string[]) {
    const anomalies: Array<{ timestamp: string; metric: string; value: number; severity: 'low' | 'medium' | 'high' }> = [];
    
    metrics.forEach(metric => {
      const values = data.map(d => d[metric]).filter(v => typeof v === 'number');
      if (values.length < 10) return;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      data.forEach(item => {
        const value = item[metric];
        if (typeof value === 'number') {
          const zScore = Math.abs((value - mean) / stdDev);
          if (zScore > 2) {
            anomalies.push({
              timestamp: item.timestamp,
              metric,
              value,
              severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
            });
          }
        }
      });
    });

    return anomalies.slice(-20); // Return last 20 anomalies
  }

  function generateHeatmapData(data: MetricData[]) {
    const heatmap: HeatmapData[] = [];
    const hourlyData: Record<string, Record<number, { sum: number; count: number; incidents: number }>> = {};

    data.forEach(item => {
      const date = parseISO(item.timestamp);
      const day = format(date, 'yyyy-MM-dd');
      const hour = date.getHours();
      
      if (!hourlyData[day]) hourlyData[day] = {};
      if (!hourlyData[day][hour]) hourlyData[day][hour] = { sum: 0, count: 0, incidents: 0 };
      
      hourlyData[day][hour].sum += item.response_time;
      hourlyData[day][hour].count += 1;
      if (item.error_rate > 5) hourlyData[day][hour].incidents += 1;
    });

    Object.entries(hourlyData).forEach(([day, hours]) => {
      Object.entries(hours).forEach(([hour, data]) => {
        heatmap.push({
          day,
          hour: parseInt(hour),
          value: data.sum / data.count,
          incidents: data.incidents,
        });
      });
    });

    setHeatmapData(heatmap.slice(-168)); // Last 7 days
  }

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleDrillDown = useCallback((filters: Record<string, any>) => {
    setDrillDownFilters(filters);
    onDrillDown?.(filters);
  }, [onDrillDown]);

  const handleMetricToggle = useCallback((metric: string) => {
    onMetricSelect?.(metric);
  }, [onMetricSelect]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-xs">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-sm mb-1">
            <span style={{ color: entry.color }} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: entry.color }}
              />
              {METRIC_CONFIGS[entry.dataKey]?.name || entry.dataKey}:
            </span>
            <span className="font-medium ml-2">
              {METRIC_CONFIGS[entry.dataKey]?.format?.(entry.value) || entry.value}
            </span>
          </div>
        ))}
        
        {/* Show anomalies if any */}
        {anomalies.filter(a => a.timestamp === label).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              ⚠️ Anomaly detected
            </span>
          </div>
        )}
      </div>
    );
  };

  // Render functions for different chart types
  const renderComposedChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={processedData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="timestamp_formatted" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          yAxisId="left"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        
        {selectedMetrics.slice(0, 2).map((metric, index) => (
          <Area
            key={metric}
            yAxisId="left"
            type="monotone"
            dataKey={metric}
            fill={METRIC_CONFIGS[metric]?.color || '#8884d8'}
            fillOpacity={0.3}
            stroke={METRIC_CONFIGS[metric]?.color || '#8884d8'}
            strokeWidth={2}
            isAnimationActive={animationEnabled}
            name={METRIC_CONFIGS[metric]?.name || metric}
          />
        ))}
        
        {selectedMetrics.slice(2, 4).map((metric, index) => (
          <Line
            key={metric}
            yAxisId="right"
            type="monotone"
            dataKey={metric}
            stroke={METRIC_CONFIGS[metric]?.color || '#82ca9d'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animationEnabled}
            name={METRIC_CONFIGS[metric]?.name || metric}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderHeatmap = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Response Time Heatmap (Last 7 Days)
      </h4>
      <div className="grid grid-cols-24 gap-1">
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="text-xs text-center text-gray-500 py-1">
            {hour}
          </div>
        ))}
        {heatmapData.map((cell, index) => (
          <div
            key={index}
            className="aspect-square rounded text-xs flex items-center justify-center text-white font-medium cursor-pointer hover:scale-110 transition-transform"
            style={{
              backgroundColor: getHeatmapColor(cell.value, 0, 1000),
            }}
            title={`${cell.day} ${cell.hour}:00 - ${cell.value.toFixed(0)}ms`}
            onClick={() => handleDrillDown({ day: cell.day, hour: cell.hour })}
          >
            {cell.incidents > 0 && '⚠️'}
          </div>
        ))}
      </div>
    </div>
  );

  function getHeatmapColor(value: number, min: number, max: number): string {
    const intensity = (value - min) / (max - min);
    const colors = [
      [34, 197, 94],   // green
      [234, 179, 8],   // yellow
      [239, 68, 68],   // red
    ];
    
    const colorIndex = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
    const [r, g, b] = colors[colorIndex];
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load metrics</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={(node) => {
        if (node) {
          (dashboardRef as any).current = node;
          (containerRef as any).current = node;
        }
      }}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
      role="region"
      aria-label="Advanced metrics dashboard"
      tabIndex={0}
    >
      {/* Dashboard Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Advanced Metrics Dashboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time system performance and health monitoring
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            {enableRealTime && (
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Refresh dashboard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Chart Type Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {Object.entries(CHART_TYPES).slice(0, 4).map(([key, name]) => (
              <button
                key={key}
                onClick={() => setActiveChart(key as ChartType)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeChart === key
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Animation Toggle */}
          <label className="flex items-center space-x-2 text-xs">
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={(e) => setAnimationEnabled(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-gray-600 dark:text-gray-400">Animations</span>
          </label>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6">
        {/* Main Chart */}
        <div className="mb-8">
          <PinchZoomContainer 
            minZoom={0.5} 
            maxZoom={3} 
            className="h-96"
            onZoomChange={(zoom) => console.log('Chart zoom:', zoom)}
          >
            {activeChart === 'composed' && renderComposedChart()}
            {activeChart === 'heatmap' && renderHeatmap()}
          </PinchZoomContainer>
        </div>

        {/* Anomalies Alert */}
        {anomalies.length > 0 && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h4 className="font-medium text-orange-800 dark:text-orange-200">
                Anomalies Detected ({anomalies.length})
              </h4>
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">
              Recent anomalies detected in: {[...new Set(anomalies.map(a => METRIC_CONFIGS[a.metric]?.name || a.metric))].join(', ')}
            </div>
          </div>
        )}

        {/* Service Health Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {serviceData.slice(0, 8).map((service, index) => (
            <div
              key={service.service_name}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => handleDrillDown({ service: service.service_name })}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {service.service_name}
                </h4>
                <div className={`w-2 h-2 rounded-full ${
                  service.status === 'healthy' ? 'bg-green-500' :
                  service.status === 'warning' ? 'bg-yellow-500' :
                  service.status === 'critical' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
              </div>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span>{service.response_time.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <span>{service.error_rate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span>{service.uptime.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedMetricsDashboard;