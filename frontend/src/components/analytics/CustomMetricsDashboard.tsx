/**
 * Custom Metrics Dashboard
 * 
 * Advanced analytics dashboard with:
 * - Custom metric creation and visualization
 * - Real-time data streaming
 * - Advanced filtering and aggregation
 * - Predictive analytics
 * - Anomaly detection
 * - Interactive drill-down capabilities
 * - Export and sharing features
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { PinchZoomContainer } from '@/components/touch';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import ExportModal from './ExportModal';
import MetricBuilderModal from './MetricBuilderModal';

export interface CustomMetric {
  id: string;
  name: string;
  description: string;
  query: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  category: string;
  unit: string;
  color: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface ChartConfiguration {
  type: 'line' | 'area' | 'bar' | 'scatter' | 'pie' | 'composed';
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
  aggregationInterval: '1m' | '5m' | '15m' | '1h' | '1d';
  metrics: string[];
  filters: Record<string, any>;
  groupBy?: string[];
  yAxisScale: 'linear' | 'log';
  showPrediction: boolean;
  showAnomalies: boolean;
}

interface CustomMetricsDashboardProps {
  initialMetrics?: CustomMetric[];
  onMetricCreate?: (metric: CustomMetric) => void;
  onMetricUpdate?: (metric: CustomMetric) => void;
  onMetricDelete?: (metricId: string) => void;
}

export const CustomMetricsDashboard: React.FC<CustomMetricsDashboardProps> = ({
  initialMetrics = [],
  onMetricCreate,
  onMetricUpdate,
  onMetricDelete,
}) => {
  const [metrics, setMetrics] = useState<CustomMetric[]>(initialMetrics);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    type: 'line',
    timeRange: '24h',
    aggregationInterval: '5m',
    metrics: [],
    filters: {},
    yAxisScale: 'linear',
    showPrediction: false,
    showAnomalies: true,
  });
  
  const [metricData, setMetricData] = useState<Record<string, MetricDataPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMetricBuilder, setShowMetricBuilder] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomMetric | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Real-time data updates
  const { data: realTimeData } = useRealTimeData({
    endpoint: '/api/metrics/realtime',
    enabled: true,
    interval: 30000,
  });

  // Fetch metric data
  const fetchMetricData = useCallback(async (metricIds: string[]) => {
    if (metricIds.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/metrics/custom/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricIds,
          timeRange: chartConfig.timeRange,
          aggregationInterval: chartConfig.aggregationInterval,
          filters: chartConfig.filters,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to fetch metric data');
      
      const data = await response.json();
      setMetricData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [chartConfig]);

  // Update chart configuration
  const updateChartConfig = useCallback((updates: Partial<ChartConfiguration>) => {
    setChartConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Create new metric
  const createMetric = useCallback(async (metricData: Omit<CustomMetric, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/metrics/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metricData),
      });
      
      if (!response.ok) throw new Error('Failed to create metric');
      
      const newMetric = await response.json();
      setMetrics(prev => [...prev, newMetric]);
      onMetricCreate?.(newMetric);
      setShowMetricBuilder(false);
    } catch (err) {
      console.error('Failed to create metric:', err);
    }
  }, [onMetricCreate]);

  // Update existing metric
  const updateMetric = useCallback(async (metric: CustomMetric) => {
    try {
      const response = await fetch(`/api/metrics/custom/${metric.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      });
      
      if (!response.ok) throw new Error('Failed to update metric');
      
      const updatedMetric = await response.json();
      setMetrics(prev => prev.map(m => m.id === metric.id ? updatedMetric : m));
      onMetricUpdate?.(updatedMetric);
      setEditingMetric(null);
    } catch (err) {
      console.error('Failed to update metric:', err);
    }
  }, [onMetricUpdate]);

  // Delete metric
  const deleteMetric = useCallback(async (metricId: string) => {
    try {
      const response = await fetch(`/api/metrics/custom/${metricId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete metric');
      
      setMetrics(prev => prev.filter(m => m.id !== metricId));
      setSelectedMetrics(prev => prev.filter(id => id !== metricId));
      onMetricDelete?.(metricId);
    } catch (err) {
      console.error('Failed to delete metric:', err);
    }
  }, [onMetricDelete]);

  // Export data functionality
  const exportData = () => {
    setShowExportModal(true);
  };

  // Process data for visualization
  const processedData = useMemo(() => {
    if (selectedMetrics.length === 0) return [];
    
    const timePoints = new Set<string>();
    selectedMetrics.forEach(metricId => {
      metricData[metricId]?.forEach(point => timePoints.add(point.timestamp));
    });
    
    const sortedTimePoints = Array.from(timePoints).sort();
    
    return sortedTimePoints.map(timestamp => {
      const point: any = { timestamp };
      selectedMetrics.forEach(metricId => {
        const metric = metrics.find(m => m.id === metricId);
        const dataPoint = metricData[metricId]?.find(p => p.timestamp === timestamp);
        point[metricId] = dataPoint?.value || null;
        point[`${metricId}_formatted`] = dataPoint ? formatValue(dataPoint.value, metric?.unit) : null;
      });
      return point;
    });
  }, [selectedMetrics, metricData, metrics]);

  // Anomaly detection
  const detectAnomalies = useCallback((data: MetricDataPoint[], metric: CustomMetric) => {
    if (data.length < 10) return [];
    
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
    
    const threshold = 2.5; // Z-score threshold
    
    return data.filter(point => {
      const zScore = Math.abs((point.value - mean) / stdDev);
      return zScore > threshold;
    });
  }, []);

  // Predictive analytics (simple linear regression)
  const generatePrediction = useCallback((data: MetricDataPoint[], steps: number = 5) => {
    if (data.length < 2) return [];
    
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const lastTimestamp = new Date(data[data.length - 1].timestamp);
    const predictions = [];
    
    for (let i = 1; i <= steps; i++) {
      const futureTimestamp = new Date(lastTimestamp.getTime() + i * 5 * 60 * 1000); // 5 minutes intervals
      const predictedValue = slope * (n + i - 1) + intercept;
      
      predictions.push({
        timestamp: futureTimestamp.toISOString(),
        value: Math.max(0, predictedValue), // Ensure non-negative
        isPrediction: true,
      });
    }
    
    return predictions;
  }, []);

  // Effect to fetch data when metrics or config changes
  useEffect(() => {
    fetchMetricData(selectedMetrics);
  }, [selectedMetrics, fetchMetricData]);

  // Update real-time data
  useEffect(() => {
    if (realTimeData && selectedMetrics.length > 0) {
      setMetricData(prev => {
        const updated = { ...prev };
        selectedMetrics.forEach(metricId => {
          if (realTimeData[metricId]) {
            updated[metricId] = [...(updated[metricId] || []), realTimeData[metricId]].slice(-100);
          }
        });
        return updated;
      });
    }
  }, [realTimeData, selectedMetrics]);

  // Render chart based on configuration
  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to load data</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => fetchMetricData(selectedMetrics)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (processedData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No data available</h3>
            <p className="text-gray-600 dark:text-gray-400">Select metrics to display data</p>
          </div>
        </div>
      );
    }

    const chartProps = {
      data: processedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const renderLines = () => selectedMetrics.map(metricId => {
      const metric = metrics.find(m => m.id === metricId);
      if (!metric) return null;

      return (
        <Line
          key={metricId}
          type="monotone"
          dataKey={metricId}
          stroke={metric.color}
          strokeWidth={2}
          dot={false}
          name={metric.name}
        />
      );
    });

    const renderAreas = () => selectedMetrics.map(metricId => {
      const metric = metrics.find(m => m.id === metricId);
      if (!metric) return null;

      return (
        <Area
          key={metricId}
          type="monotone"
          dataKey={metricId}
          stroke={metric.color}
          fill={metric.color}
          fillOpacity={0.3}
          name={metric.name}
        />
      );
    });

    const renderBars = () => selectedMetrics.map(metricId => {
      const metric = metrics.find(m => m.id === metricId);
      if (!metric) return null;

      return (
        <Bar
          key={metricId}
          dataKey={metricId}
          fill={metric.color}
          name={metric.name}
        />
      );
    });

    switch (chartConfig.type) {
      case 'line':
        return (
          <PinchZoomContainer className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                />
                <YAxis scale={chartConfig.yAxisScale} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                  formatter={(value: any, name: string) => {
                    const metric = metrics.find(m => m.id === name);
                    return [formatValue(value, metric?.unit), metric?.name || name];
                  }}
                />
                <Legend />
                {renderLines()}
              </LineChart>
            </ResponsiveContainer>
          </PinchZoomContainer>
        );

      case 'area':
        return (
          <PinchZoomContainer className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                />
                <YAxis scale={chartConfig.yAxisScale} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                  formatter={(value: any, name: string) => {
                    const metric = metrics.find(m => m.id === name);
                    return [formatValue(value, metric?.unit), metric?.name || name];
                  }}
                />
                <Legend />
                {renderAreas()}
              </AreaChart>
            </ResponsiveContainer>
          </PinchZoomContainer>
        );

      case 'bar':
        return (
          <PinchZoomContainer className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                />
                <YAxis scale={chartConfig.yAxisScale} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                  formatter={(value: any, name: string) => {
                    const metric = metrics.find(m => m.id === name);
                    return [formatValue(value, metric?.unit), metric?.name || name];
                  }}
                />
                <Legend />
                {renderBars()}
              </BarChart>
            </ResponsiveContainer>
          </PinchZoomContainer>
        );

      case 'scatter':
        return (
          <PinchZoomContainer className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                />
                <YAxis scale={chartConfig.yAxisScale} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                  formatter={(value: any, name: string) => {
                    const metric = metrics.find(m => m.id === name);
                    return [formatValue(value, metric?.unit), metric?.name || name];
                  }}
                />
                <Legend />
                {selectedMetrics.map(metricId => {
                  const metric = metrics.find(m => m.id === metricId);
                  if (!metric) return null;
                  return (
                    <Scatter
                      key={metricId}
                      dataKey={metricId}
                      fill={metric.color}
                      name={metric.name}
                    />
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </PinchZoomContainer>
        );

      case 'composed':
        return (
          <PinchZoomContainer className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart {...chartProps}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                />
                <YAxis scale={chartConfig.yAxisScale} />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')}
                  formatter={(value: any, name: string) => {
                    const metric = metrics.find(m => m.id === name);
                    return [formatValue(value, metric?.unit), metric?.name || name];
                  }}
                />
                <Legend />
                {renderLines()}
                {renderBars()}
              </ComposedChart>
            </ResponsiveContainer>
          </PinchZoomContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Custom Metrics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and visualize custom metrics with advanced analytics
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowMetricBuilder(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Create Metric
          </button>
          <button
            onClick={() => exportData()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chart Type
            </label>
            <select
              value={chartConfig.type}
              onChange={(e) => updateChartConfig({ type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="composed">Composed Chart</option>
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={chartConfig.timeRange}
              onChange={(e) => updateChartConfig({ timeRange: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Aggregation Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interval
            </label>
            <select
              value={chartConfig.aggregationInterval}
              onChange={(e) => updateChartConfig({ aggregationInterval: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="1d">1 Day</option>
            </select>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartConfig.showAnomalies}
                  onChange={(e) => updateChartConfig({ showAnomalies: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Show Anomalies</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={chartConfig.showPrediction}
                  onChange={(e) => updateChartConfig({ showPrediction: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Show Prediction</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedMetrics.includes(metric.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              onClick={() => {
                setSelectedMetrics(prev =>
                  prev.includes(metric.id)
                    ? prev.filter(id => id !== metric.id)
                    : [...prev, metric.id]
                );
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {metric.name}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingMetric(metric);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMetric(metric.id);
                    }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {metric.description}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{metric.category}</span>
                <span className="text-gray-500">{metric.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {renderChart()}
      </div>
      
      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          data={processedData}
          metrics={selectedMetrics.map(id => metrics.find(m => m.id === id)!).filter(Boolean)}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Metric Builder Modal */}
      {showMetricBuilder && (
        <MetricBuilderModal
          onSave={createMetric}
          onCancel={() => setShowMetricBuilder(false)}
          existingMetrics={metrics}
        />
      )}
      
      {/* Edit Metric Modal */}
      {editingMetric && (
        <MetricBuilderModal
          metric={editingMetric}
          onSave={updateMetric}
          onCancel={() => setEditingMetric(null)}
          existingMetrics={metrics}
        />
      )}
    </div>
  );
};

// Utility functions
function formatValue(value: number, unit?: string): string {
  if (value === null || value === undefined) return 'N/A';
  
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  
  return unit ? `${formatted} ${unit}` : formatted;
}

export default CustomMetricsDashboard;