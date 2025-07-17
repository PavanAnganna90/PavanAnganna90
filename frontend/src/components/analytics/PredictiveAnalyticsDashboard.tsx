/**
 * Predictive Analytics Dashboard
 * 
 * Advanced dashboard for predictive infrastructure analytics:
 * - Resource usage forecasting
 * - Capacity planning
 * - Anomaly prediction
 * - Cost forecasting
 * - Performance trend analysis
 * - Automated recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea, ComposedChart, Bar
} from 'recharts';
import { predictiveAnalytics, PredictionResult, ResourcePrediction, CapacityPlan, AnomalyPrediction } from '@/services/predictiveAnalytics';
import { useRealTimeData } from '@/hooks/useRealTimeData';

interface PredictiveAnalyticsDashboardProps {
  className?: string;
}

interface MetricData {
  name: string;
  current: number;
  predicted: number;
  historical: Array<{ timestamp: Date; value: number }>;
  prediction: PredictionResult;
}

interface DashboardState {
  metrics: MetricData[];
  resourcePredictions: ResourcePrediction[];
  capacityPlan: CapacityPlan | null;
  anomalyPredictions: AnomalyPrediction[];
  selectedTimeframe: string;
  selectedMetric: string;
  loading: boolean;
  error: string | null;
}

export const PredictiveAnalyticsDashboard: React.FC<PredictiveAnalyticsDashboardProps> = ({
  className = "",
}) => {
  const [state, setState] = useState<DashboardState>({
    metrics: [],
    resourcePredictions: [],
    capacityPlan: null,
    anomalyPredictions: [],
    selectedTimeframe: '7d',
    selectedMetric: 'cpu',
    loading: true,
    error: null,
  });

  // Real-time data for predictions
  const { data: metricsData } = useRealTimeData({
    endpoint: '/api/metrics/timeseries',
    enabled: true,
    interval: 60000, // 1 minute
  });

  // Load historical data and generate predictions
  const loadPredictions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Mock historical data - in production, fetch from your metrics API
      const mockHistoricalData = {
        cpu: generateMockTimeSeries('cpu', 30),
        memory: generateMockTimeSeries('memory', 30),
        disk: generateMockTimeSeries('disk', 30),
        network: generateMockTimeSeries('network', 30),
      };

      const timeframeDays = parseInt(state.selectedTimeframe.replace('d', ''));
      const predictions: MetricData[] = [];

      // Generate predictions for each metric
      for (const [metricName, historicalData] of Object.entries(mockHistoricalData)) {
        const prediction = await predictiveAnalytics.predict(
          metricName,
          historicalData,
          timeframeDays
        );

        predictions.push({
          name: metricName,
          current: historicalData[historicalData.length - 1].value,
          predicted: prediction.predictions[prediction.predictions.length - 1]?.value || 0,
          historical: historicalData,
          prediction,
        });
      }

      // Generate resource predictions
      const resourcePredictions = await predictiveAnalytics.predictResourceUsage(
        Object.entries(mockHistoricalData).map(([name, data]) => ({ name, data })),
        timeframeDays
      );

      // Generate capacity plan
      const capacityPlan = await predictiveAnalytics.generateCapacityPlan(
        Object.entries(mockHistoricalData).map(([name, data]) => ({ 
          name, 
          data, 
          cost: Math.random() * 1000 + 500 // Mock cost
        })),
        state.selectedTimeframe
      );

      // Generate anomaly predictions
      const anomalyPredictions = await predictiveAnalytics.predictAnomalies(
        Object.entries(mockHistoricalData).map(([name, data]) => ({ name, data })),
        timeframeDays
      );

      setState(prev => ({
        ...prev,
        metrics: predictions,
        resourcePredictions,
        capacityPlan,
        anomalyPredictions,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load predictions',
        loading: false,
      }));
    }
  }, [state.selectedTimeframe]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((timeframe: string) => {
    setState(prev => ({ ...prev, selectedTimeframe: timeframe }));
  }, []);

  // Handle metric selection
  const handleMetricChange = useCallback((metric: string) => {
    setState(prev => ({ ...prev, selectedMetric: metric }));
  }, []);

  // Prepare chart data
  const prepareChartData = useCallback((metric: MetricData) => {
    const historicalData = metric.historical.map(point => ({
      timestamp: format(point.timestamp, 'MMM dd'),
      value: point.value,
      type: 'historical',
    }));

    const predictionData = metric.prediction.predictions.map(point => ({
      timestamp: format(point.timestamp, 'MMM dd'),
      value: point.value,
      type: 'prediction',
    }));

    return [...historicalData, ...predictionData];
  }, []);

  // Get severity color
  const getSeverityColor = useCallback((severity: AnomalyPrediction['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  // Get action color
  const getActionColor = useCallback((action: ResourcePrediction['action']) => {
    switch (action) {
      case 'scale_up': return 'text-green-600 bg-green-100';
      case 'scale_down': return 'text-blue-600 bg-blue-100';
      case 'alert': return 'text-red-600 bg-red-100';
      case 'maintain': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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

  if (state.error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading predictions</h3>
          <p className="text-red-600 text-sm mt-1">{state.error}</p>
          <button
            onClick={loadPredictions}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedMetricData = state.metrics.find(m => m.name === state.selectedMetric);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Predictive Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Infrastructure forecasting and capacity planning
          </p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={state.selectedTimeframe}
            onChange={(e) => handleTimeframeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7d">7 Days</option>
            <option value="14d">14 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
          
          <select
            value={state.selectedMetric}
            onChange={(e) => handleMetricChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="cpu">CPU Usage</option>
            <option value="memory">Memory Usage</option>
            <option value="disk">Disk Usage</option>
            <option value="network">Network Usage</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {state.metrics.map((metric) => (
          <div key={metric.name} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {metric.name}
              </h3>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                metric.predicted > metric.current * 1.2 ? 'bg-red-100 text-red-800' :
                metric.predicted < metric.current * 0.8 ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {metric.predicted > metric.current ? '↑' : '↓'} {Math.abs(((metric.predicted - metric.current) / metric.current) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Current</span>
                <span className="font-medium">{metric.current.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Predicted</span>
                <span className="font-medium">{metric.predicted.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Confidence</span>
                <span className="font-medium">{(metric.prediction.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      {selectedMetricData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">
            {selectedMetricData.name} Trend & Prediction
          </h3>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={prepareChartData(selectedMetricData)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                
                {/* Historical data */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name="Historical"
                />
                
                {/* Prediction area */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="#EF4444"
                  fillOpacity={0.1}
                  name="Prediction"
                />
                
                {/* Confidence bounds */}
                <ReferenceArea
                  y1={selectedMetricData.current * 0.8}
                  y2={selectedMetricData.current * 1.2}
                  fill="#10B981"
                  fillOpacity={0.1}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Resource Predictions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Resource Predictions
        </h3>
        
        <div className="space-y-4">
          {state.resourcePredictions.map((prediction) => (
            <div key={prediction.resource} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                    {prediction.resource}
                  </h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(prediction.action)}`}>
                    {prediction.action.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Current: </span>
                    <span className="font-medium">{prediction.current.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Predicted: </span>
                    <span className="font-medium">{prediction.predicted.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Confidence: </span>
                    <span className="font-medium">{(prediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {prediction.reasoning}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Plan */}
      {state.capacityPlan && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Capacity Plan ({state.capacityPlan.timeframe})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Total Cost</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${state.capacityPlan.totalCost.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100">Savings</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${state.capacityPlan.savings.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Risks</h4>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {state.capacityPlan.risks.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recommendations</h4>
              <ul className="space-y-2">
                {state.capacityPlan.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Risks</h4>
              <ul className="space-y-2">
                {state.capacityPlan.risks.map((risk, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Anomaly Predictions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Anomaly Predictions
        </h3>
        
        <div className="space-y-4">
          {state.anomalyPredictions.map((anomaly, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                  {anomaly.metric}
                </h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
                    {anomaly.severity}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {(anomaly.probability * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Predicted Time: </span>
                  <span className="font-medium">{format(anomaly.predictedTime, 'PPp')}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Impact: </span>
                  <span className="font-medium">{anomaly.impact}</span>
                </div>
              </div>
              
              <div className="mt-3">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Preventive Actions:
                </h5>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {anomaly.preventiveActions.map((action, actionIndex) => (
                    <li key={actionIndex} className="flex items-start space-x-2">
                      <span className="text-gray-400">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to generate mock time series data
function generateMockTimeSeries(metric: string, days: number) {
  const data = [];
  const baseValue = {
    cpu: 45,
    memory: 60,
    disk: 30,
    network: 25,
  }[metric] || 50;

  for (let i = days; i >= 0; i--) {
    const timestamp = addDays(new Date(), -i);
    const randomVariation = (Math.random() - 0.5) * 20;
    const seasonalPattern = Math.sin(i * 0.1) * 10;
    const trendPattern = i * 0.5;
    
    let value = baseValue + randomVariation + seasonalPattern - trendPattern;
    
    // Add some spikes for realistic data
    if (Math.random() < 0.05) {
      value += Math.random() * 40;
    }
    
    data.push({
      timestamp,
      value: Math.max(0, Math.min(100, value)),
    });
  }

  return data;
}

export default PredictiveAnalyticsDashboard;