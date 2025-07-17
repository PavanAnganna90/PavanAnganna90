/**
 * Anomaly Detection Dashboard
 * 
 * Advanced dashboard for monitoring and managing anomaly detection:
 * - Real-time anomaly visualization
 * - Multiple detection algorithms
 * - Configurable sensitivity levels
 * - Historical anomaly analysis
 * - Anomaly investigation tools
 * - Model performance metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays, subHours } from 'date-fns';
import {
  LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, PieChart, Pie, BarChart, Bar
} from 'recharts';
import { anomalyDetectionService, Anomaly, AnomalyDetectionConfig, AnomalyDetectionResult } from '@/services/anomalyDetection';
import { useRealTimeData } from '@/hooks/useRealTimeData';

interface AnomalyDetectionDashboardProps {
  className?: string;
}

interface DashboardState {
  anomalies: Anomaly[];
  detectionResults: AnomalyDetectionResult | null;
  selectedMetric: string;
  selectedAlgorithm: string;
  sensitivity: AnomalyDetectionConfig['sensitivity'];
  timeRange: string;
  loading: boolean;
  error: string | null;
  streamingDetectors: Map<string, string>;
  modelPerformance: any;
}

const METRICS = [
  { id: 'cpu', name: 'CPU Usage', unit: '%' },
  { id: 'memory', name: 'Memory Usage', unit: '%' },
  { id: 'disk', name: 'Disk Usage', unit: '%' },
  { id: 'network', name: 'Network Usage', unit: 'Mbps' },
  { id: 'response_time', name: 'Response Time', unit: 'ms' },
  { id: 'error_rate', name: 'Error Rate', unit: '%' },
];

const ALGORITHMS = [
  { id: 'zscore', name: 'Z-Score', description: 'Statistical outlier detection' },
  { id: 'modified_zscore', name: 'Modified Z-Score', description: 'Robust to outliers' },
  { id: 'iqr', name: 'IQR', description: 'Interquartile range method' },
  { id: 'isolation_forest', name: 'Isolation Forest', description: 'ML-based detection' },
  { id: 'seasonal_esd', name: 'Seasonal ESD', description: 'Seasonal pattern aware' },
  { id: 'ensemble', name: 'Ensemble', description: 'Multiple algorithm consensus' },
];

const SEVERITY_COLORS = {
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

export const AnomalyDetectionDashboard: React.FC<AnomalyDetectionDashboardProps> = ({
  className = "",
}) => {
  const [state, setState] = useState<DashboardState>({
    anomalies: [],
    detectionResults: null,
    selectedMetric: 'cpu',
    selectedAlgorithm: 'ensemble',
    sensitivity: 'medium',
    timeRange: '24h',
    loading: false,
    error: null,
    streamingDetectors: new Map(),
    modelPerformance: null,
  });

  // Real-time data for anomaly detection
  const { data: metricsData } = useRealTimeData({
    endpoint: '/api/metrics/timeseries',
    enabled: true,
    interval: 30000,
  });

  // Run anomaly detection
  const runDetection = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Generate mock time series data
      const mockData = generateMockTimeSeriesData(state.selectedMetric, state.timeRange);
      
      // Configure detection
      const config: Partial<AnomalyDetectionConfig> = {
        algorithm: state.selectedAlgorithm as any,
        sensitivity: state.sensitivity,
        windowSize: 100,
        threshold: getSensitivityThreshold(state.sensitivity),
        minSamples: 20,
        enableContextual: true,
        enableCollective: true,
        enableRealtime: false,
      };

      // Run detection
      const results = await anomalyDetectionService.detectAnomalies(
        state.selectedMetric,
        mockData,
        config
      );

      setState(prev => ({
        ...prev,
        anomalies: results.anomalies,
        detectionResults: results,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Detection failed',
        loading: false,
      }));
    }
  }, [state.selectedMetric, state.selectedAlgorithm, state.sensitivity, state.timeRange]);

  // Setup streaming detector
  const setupStreamingDetector = useCallback(async (metricName: string) => {
    try {
      const config: Partial<AnomalyDetectionConfig> = {
        algorithm: 'modified_zscore',
        sensitivity: state.sensitivity,
        windowSize: 50,
        threshold: getSensitivityThreshold(state.sensitivity),
        minSamples: 10,
        enableRealtime: true,
      };

      const detectorId = await anomalyDetectionService.createStreamingDetector(metricName, config);
      
      setState(prev => ({
        ...prev,
        streamingDetectors: new Map(prev.streamingDetectors.set(metricName, detectorId)),
      }));
    } catch (error) {
      console.error('Failed to setup streaming detector:', error);
    }
  }, [state.sensitivity]);

  // Initial detection run
  useEffect(() => {
    runDetection();
  }, [runDetection]);

  // Setup streaming detectors
  useEffect(() => {
    METRICS.forEach(metric => {
      if (!state.streamingDetectors.has(metric.id)) {
        setupStreamingDetector(metric.id);
      }
    });
  }, [setupStreamingDetector, state.streamingDetectors]);

  // Handle real-time data
  useEffect(() => {
    if (metricsData) {
      // Process streaming data points
      Object.entries(metricsData).forEach(([metricName, value]) => {
        const detectorId = state.streamingDetectors.get(metricName);
        if (detectorId && typeof value === 'number') {
          const point = {
            timestamp: new Date(),
            value: value,
          };
          
          anomalyDetectionService.processStreamingPoint(detectorId, point)
            .then(anomaly => {
              if (anomaly) {
                setState(prev => ({
                  ...prev,
                  anomalies: [anomaly, ...prev.anomalies.slice(0, 99)], // Keep last 100
                }));
              }
            })
            .catch(error => console.error('Streaming detection error:', error));
        }
      });
    }
  }, [metricsData, state.streamingDetectors]);

  // Handle parameter changes
  const handleMetricChange = useCallback((metric: string) => {
    setState(prev => ({ ...prev, selectedMetric: metric }));
  }, []);

  const handleAlgorithmChange = useCallback((algorithm: string) => {
    setState(prev => ({ ...prev, selectedAlgorithm: algorithm }));
  }, []);

  const handleSensitivityChange = useCallback((sensitivity: AnomalyDetectionConfig['sensitivity']) => {
    setState(prev => ({ ...prev, sensitivity }));
  }, []);

  const handleTimeRangeChange = useCallback((timeRange: string) => {
    setState(prev => ({ ...prev, timeRange }));
  }, []);

  // Prepare chart data
  const prepareChartData = useCallback(() => {
    if (!state.detectionResults) return [];

    const timeSeriesData = generateMockTimeSeriesData(state.selectedMetric, state.timeRange);
    const anomalyMap = new Map(state.anomalies.map(a => [a.timestamp.toISOString(), a]));

    return timeSeriesData.map(point => ({
      timestamp: format(point.timestamp, 'HH:mm'),
      value: point.value,
      isAnomaly: anomalyMap.has(point.timestamp.toISOString()),
      anomaly: anomalyMap.get(point.timestamp.toISOString()),
    }));
  }, [state.detectionResults, state.anomalies, state.selectedMetric, state.timeRange]);

  // Get severity distribution
  const getSeverityDistribution = useCallback(() => {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    state.anomalies.forEach(anomaly => {
      distribution[anomaly.severity]++;
    });
    return Object.entries(distribution).map(([severity, count]) => ({
      name: severity,
      value: count,
      color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS],
    }));
  }, [state.anomalies]);

  // Get algorithm performance
  const getAlgorithmPerformance = useCallback(() => {
    return ALGORITHMS.map(algo => ({
      name: algo.name,
      accuracy: Math.random() * 0.3 + 0.7, // Mock data
      precision: Math.random() * 0.3 + 0.7,
      recall: Math.random() * 0.3 + 0.7,
    }));
  }, []);

  if (state.loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const chartData = prepareChartData();
  const severityDistribution = getSeverityDistribution();
  const algorithmPerformance = getAlgorithmPerformance();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Anomaly Detection
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time anomaly detection and analysis
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={runDetection}
            disabled={state.loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md"
          >
            {state.loading ? 'Running...' : 'Run Detection'}
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Detection Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metric
            </label>
            <select
              value={state.selectedMetric}
              onChange={(e) => handleMetricChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {METRICS.map(metric => (
                <option key={metric.id} value={metric.id}>
                  {metric.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Algorithm
            </label>
            <select
              value={state.selectedAlgorithm}
              onChange={(e) => handleAlgorithmChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {ALGORITHMS.map(algo => (
                <option key={algo.id} value={algo.id}>
                  {algo.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sensitivity
            </label>
            <select
              value={state.sensitivity}
              onChange={(e) => handleSensitivityChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Range
            </label>
            <select
              value={state.timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Total Anomalies</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {state.anomalies.length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Critical Anomalies</h3>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {state.anomalies.filter(a => a.severity === 'critical').length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Detection Accuracy</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {state.detectionResults ? (state.detectionResults.summary.accuracy * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Streaming Detectors</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {state.streamingDetectors.size}
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Anomaly Detection Results
        </h3>
        
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                        <p className="font-medium">{label}</p>
                        <p className="text-sm">
                          Value: {payload[0].value}
                        </p>
                        {data.isAnomaly && data.anomaly && (
                          <div className="mt-2 text-sm">
                            <p className="text-red-600">🚨 Anomaly Detected</p>
                            <p>Severity: {data.anomaly.severity}</p>
                            <p>Score: {data.anomaly.score.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              
              {/* Normal data line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                name="Metric Value"
              />
              
              {/* Anomaly points */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#EF4444"
                strokeWidth={0}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isAnomaly) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={SEVERITY_COLORS[payload.anomaly.severity]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                }}
                name="Anomalies"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Severity Distribution
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Algorithm Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Algorithm Performance
          </h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={algorithmPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="accuracy" fill="#3B82F6" name="Accuracy" />
                <Bar dataKey="precision" fill="#10B981" name="Precision" />
                <Bar dataKey="recall" fill="#F59E0B" name="Recall" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Anomalies */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Anomalies
        </h3>
        
        <div className="space-y-4">
          {state.anomalies.slice(0, 10).map((anomaly) => (
            <div key={anomaly.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full`}
                    style={{ backgroundColor: SEVERITY_COLORS[anomaly.severity] }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {format(anomaly.timestamp, 'PPp')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    anomaly.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    anomaly.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {anomaly.severity}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Score: {anomaly.score.toFixed(2)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Value: </span>
                  <span className="font-medium">{anomaly.value.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Expected: </span>
                  <span className="font-medium">{anomaly.expectedValue.toFixed(2)}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {anomaly.explanation}
              </p>
              
              {anomaly.recommendations.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Recommendations:
                  </h5>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {anomaly.recommendations.slice(0, 2).map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-gray-400">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getSensitivityThreshold(sensitivity: AnomalyDetectionConfig['sensitivity']): number {
  switch (sensitivity) {
    case 'low': return 3.0;
    case 'medium': return 2.5;
    case 'high': return 2.0;
    case 'critical': return 1.5;
    default: return 2.5;
  }
}

function generateMockTimeSeriesData(metric: string, timeRange: string) {
  const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168;
  const points = hours * 4; // 4 points per hour
  const data = [];
  
  const baseValue = {
    cpu: 45,
    memory: 60,
    disk: 30,
    network: 25,
    response_time: 200,
    error_rate: 2,
  }[metric] || 50;

  for (let i = 0; i < points; i++) {
    const timestamp = subHours(new Date(), (points - i) * 0.25);
    const randomVariation = (Math.random() - 0.5) * 20;
    const seasonalPattern = Math.sin(i * 0.1) * 10;
    
    let value = baseValue + randomVariation + seasonalPattern;
    
    // Add some anomalies
    if (Math.random() < 0.03) {
      value += Math.random() * 60 - 30;
    }
    
    data.push({
      timestamp,
      value: Math.max(0, value),
    });
  }

  return data;
}

export default AnomalyDetectionDashboard;