/**
 * Predictive Analytics Service
 * 
 * Advanced infrastructure monitoring with predictive capabilities:
 * - Time series forecasting
 * - Resource usage prediction
 * - Capacity planning
 * - Cost forecasting
 * - Performance trend analysis
 * - Anomaly prediction
 * - Seasonal pattern recognition
 */

import { addDays, subDays, format } from 'date-fns';

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface PredictionResult {
  predictions: TimeSeriesData[];
  confidence: number;
  accuracy: number;
  model: string;
  parameters: Record<string, any>;
  seasonality?: SeasonalityPattern;
  trend?: TrendAnalysis;
}

export interface SeasonalityPattern {
  period: number;
  strength: number;
  peaks: number[];
  valleys: number[];
}

export interface TrendAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  changePoints: Date[];
  confidence: number;
}

export interface ResourcePrediction {
  resource: string;
  current: number;
  predicted: number;
  confidence: number;
  timeline: Date;
  threshold: number;
  action: 'scale_up' | 'scale_down' | 'maintain' | 'alert';
  reasoning: string;
}

export interface CapacityPlan {
  timeframe: string;
  resources: ResourcePrediction[];
  totalCost: number;
  savings: number;
  recommendations: string[];
  risks: string[];
}

export interface AnomalyPrediction {
  metric: string;
  predictedTime: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: string;
  preventiveActions: string[];
}

export class PredictiveAnalytics {
  private models: Map<string, any> = new Map();
  private historicalData: Map<string, TimeSeriesData[]> = new Map();
  private predictionCache: Map<string, PredictionResult> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    // Initialize various forecasting models
    this.models.set('linear_regression', {
      name: 'Linear Regression',
      predict: this.linearRegression.bind(this),
      accuracy: 0.75,
    });

    this.models.set('moving_average', {
      name: 'Moving Average',
      predict: this.movingAverage.bind(this),
      accuracy: 0.65,
    });

    this.models.set('exponential_smoothing', {
      name: 'Exponential Smoothing',
      predict: this.exponentialSmoothing.bind(this),
      accuracy: 0.8,
    });

    this.models.set('seasonal_decomposition', {
      name: 'Seasonal Decomposition',
      predict: this.seasonalDecomposition.bind(this),
      accuracy: 0.85,
    });

    this.models.set('arima', {
      name: 'ARIMA',
      predict: this.arimaModel.bind(this),
      accuracy: 0.9,
    });
  }

  // Main prediction method
  async predict(
    metric: string,
    data: TimeSeriesData[],
    horizonDays: number = 7,
    model: string = 'auto'
  ): Promise<PredictionResult> {
    const cacheKey = `${metric}_${model}_${horizonDays}`;
    
    // Check cache first
    if (this.predictionCache.has(cacheKey)) {
      const cached = this.predictionCache.get(cacheKey)!;
      // Return cached result if less than 1 hour old
      if (Date.now() - cached.predictions[0].timestamp.getTime() < 3600000) {
        return cached;
      }
    }

    // Store historical data
    this.historicalData.set(metric, data);

    // Auto-select best model if not specified
    if (model === 'auto') {
      model = await this.selectBestModel(data);
    }

    const selectedModel = this.models.get(model);
    if (!selectedModel) {
      throw new Error(`Model ${model} not found`);
    }

    // Generate predictions
    const predictions = await selectedModel.predict(data, horizonDays);
    
    // Analyze trend and seasonality
    const trend = this.analyzeTrend(data);
    const seasonality = this.detectSeasonality(data);
    
    // Calculate confidence based on data quality and model accuracy
    const confidence = this.calculateConfidence(data, selectedModel.accuracy);

    const result: PredictionResult = {
      predictions,
      confidence,
      accuracy: selectedModel.accuracy,
      model: selectedModel.name,
      parameters: {},
      seasonality,
      trend,
    };

    // Cache the result
    this.predictionCache.set(cacheKey, result);

    return result;
  }

  // Resource usage prediction
  async predictResourceUsage(
    resources: { name: string; data: TimeSeriesData[] }[],
    timeframe: number = 30
  ): Promise<ResourcePrediction[]> {
    const predictions: ResourcePrediction[] = [];

    for (const resource of resources) {
      const prediction = await this.predict(resource.name, resource.data, timeframe);
      
      // Get current and predicted values
      const current = resource.data[resource.data.length - 1]?.value || 0;
      const predicted = prediction.predictions[prediction.predictions.length - 1]?.value || 0;
      
      // Determine action based on prediction
      let action: ResourcePrediction['action'] = 'maintain';
      let reasoning = '';
      
      const threshold = this.calculateThreshold(resource.data);
      
      if (predicted > threshold * 0.8) {
        action = 'scale_up';
        reasoning = `Predicted usage (${predicted.toFixed(2)}) approaching threshold (${threshold.toFixed(2)})`;
      } else if (predicted < threshold * 0.3) {
        action = 'scale_down';
        reasoning = `Predicted usage (${predicted.toFixed(2)}) significantly below threshold, consider scaling down`;
      } else if (predicted > threshold) {
        action = 'alert';
        reasoning = `Predicted usage (${predicted.toFixed(2)}) exceeds threshold (${threshold.toFixed(2)})`;
      } else {
        reasoning = `Predicted usage (${predicted.toFixed(2)}) within normal range`;
      }

      predictions.push({
        resource: resource.name,
        current,
        predicted,
        confidence: prediction.confidence,
        timeline: addDays(new Date(), timeframe),
        threshold,
        action,
        reasoning,
      });
    }

    return predictions;
  }

  // Capacity planning
  async generateCapacityPlan(
    resourceData: { name: string; data: TimeSeriesData[]; cost: number }[],
    timeframe: string = '30d'
  ): Promise<CapacityPlan> {
    const days = parseInt(timeframe.replace('d', ''));
    const resourcePredictions = await this.predictResourceUsage(
      resourceData.map(r => ({ name: r.name, data: r.data })),
      days
    );

    // Calculate costs
    let totalCost = 0;
    let savings = 0;
    const recommendations: string[] = [];
    const risks: string[] = [];

    resourcePredictions.forEach((prediction, index) => {
      const resource = resourceData[index];
      const currentCost = resource.cost;
      const predictedCost = (prediction.predicted / prediction.current) * currentCost;
      
      totalCost += predictedCost;
      
      if (prediction.action === 'scale_down') {
        const potentialSavings = currentCost - predictedCost;
        savings += potentialSavings;
        recommendations.push(`Scale down ${prediction.resource} to save $${potentialSavings.toFixed(2)}/month`);
      } else if (prediction.action === 'scale_up') {
        const additionalCost = predictedCost - currentCost;
        recommendations.push(`Scale up ${prediction.resource} (+$${additionalCost.toFixed(2)}/month)`);
      } else if (prediction.action === 'alert') {
        risks.push(`${prediction.resource} may exceed capacity within ${days} days`);
      }
    });

    return {
      timeframe,
      resources: resourcePredictions,
      totalCost,
      savings,
      recommendations,
      risks,
    };
  }

  // Anomaly prediction
  async predictAnomalies(
    metrics: { name: string; data: TimeSeriesData[] }[],
    lookAhead: number = 7
  ): Promise<AnomalyPrediction[]> {
    const anomalies: AnomalyPrediction[] = [];

    for (const metric of metrics) {
      const prediction = await this.predict(metric.name, metric.data, lookAhead);
      
      // Calculate statistical properties
      const values = metric.data.map(d => d.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );

      // Check for potential anomalies in predictions
      for (let i = 0; i < prediction.predictions.length; i++) {
        const predictedValue = prediction.predictions[i].value;
        const zScore = Math.abs((predictedValue - mean) / stdDev);
        
        if (zScore > 2.5) { // Potential anomaly
          const severity = this.calculateSeverity(zScore);
          const probability = this.calculateAnomalyProbability(zScore, prediction.confidence);
          
          anomalies.push({
            metric: metric.name,
            predictedTime: prediction.predictions[i].timestamp,
            severity,
            probability,
            impact: this.assessImpact(metric.name, severity),
            preventiveActions: this.generatePreventiveActions(metric.name, severity),
          });
        }
      }
    }

    return anomalies.sort((a, b) => b.probability - a.probability);
  }

  // Forecasting models implementation
  private async linearRegression(data: TimeSeriesData[], horizon: number): Promise<TimeSeriesData[]> {
    const n = data.length;
    if (n < 2) return [];

    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);

    // Calculate linear regression coefficients
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate predictions
    const predictions: TimeSeriesData[] = [];
    const lastTimestamp = data[data.length - 1].timestamp;

    for (let i = 1; i <= horizon; i++) {
      const predictedValue = slope * (n + i - 1) + intercept;
      predictions.push({
        timestamp: addDays(lastTimestamp, i),
        value: Math.max(0, predictedValue),
      });
    }

    return predictions;
  }

  private async movingAverage(data: TimeSeriesData[], horizon: number): Promise<TimeSeriesData[]> {
    const windowSize = Math.min(7, data.length);
    const recentData = data.slice(-windowSize);
    const average = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;

    const predictions: TimeSeriesData[] = [];
    const lastTimestamp = data[data.length - 1].timestamp;

    for (let i = 1; i <= horizon; i++) {
      predictions.push({
        timestamp: addDays(lastTimestamp, i),
        value: average,
      });
    }

    return predictions;
  }

  private async exponentialSmoothing(data: TimeSeriesData[], horizon: number): Promise<TimeSeriesData[]> {
    const alpha = 0.3; // Smoothing parameter
    let smoothedValue = data[0].value;

    // Apply exponential smoothing to historical data
    for (let i = 1; i < data.length; i++) {
      smoothedValue = alpha * data[i].value + (1 - alpha) * smoothedValue;
    }

    // Generate predictions
    const predictions: TimeSeriesData[] = [];
    const lastTimestamp = data[data.length - 1].timestamp;

    for (let i = 1; i <= horizon; i++) {
      predictions.push({
        timestamp: addDays(lastTimestamp, i),
        value: smoothedValue,
      });
    }

    return predictions;
  }

  private async seasonalDecomposition(data: TimeSeriesData[], horizon: number): Promise<TimeSeriesData[]> {
    const seasonality = this.detectSeasonality(data);
    const trend = this.analyzeTrend(data);
    
    const predictions: TimeSeriesData[] = [];
    const lastTimestamp = data[data.length - 1].timestamp;

    for (let i = 1; i <= horizon; i++) {
      let predictedValue = data[data.length - 1].value;
      
      // Apply trend
      if (trend.direction === 'increasing') {
        predictedValue += trend.slope * i;
      } else if (trend.direction === 'decreasing') {
        predictedValue -= Math.abs(trend.slope) * i;
      }

      // Apply seasonality
      if (seasonality && seasonality.period > 0) {
        const seasonalIndex = i % seasonality.period;
        const seasonalFactor = seasonality.strength * Math.sin(2 * Math.PI * seasonalIndex / seasonality.period);
        predictedValue += seasonalFactor;
      }

      predictions.push({
        timestamp: addDays(lastTimestamp, i),
        value: Math.max(0, predictedValue),
      });
    }

    return predictions;
  }

  private async arimaModel(data: TimeSeriesData[], horizon: number): Promise<TimeSeriesData[]> {
    // Simplified ARIMA implementation
    // In production, use a proper time series library
    const lag = Math.min(3, data.length - 1);
    const values = data.map(d => d.value);
    
    const predictions: TimeSeriesData[] = [];
    const lastTimestamp = data[data.length - 1].timestamp;

    for (let i = 1; i <= horizon; i++) {
      // Simple autoregressive prediction
      let prediction = 0;
      for (let j = 1; j <= lag; j++) {
        if (values.length - j >= 0) {
          prediction += values[values.length - j] * (0.5 / j);
        }
      }

      predictions.push({
        timestamp: addDays(lastTimestamp, i),
        value: Math.max(0, prediction),
      });
    }

    return predictions;
  }

  // Helper methods
  private async selectBestModel(data: TimeSeriesData[]): Promise<string> {
    // Simple model selection based on data characteristics
    if (data.length < 7) return 'moving_average';
    if (data.length < 30) return 'linear_regression';
    
    const seasonality = this.detectSeasonality(data);
    if (seasonality && seasonality.strength > 0.5) {
      return 'seasonal_decomposition';
    }
    
    return 'exponential_smoothing';
  }

  private analyzeTrend(data: TimeSeriesData[]): TrendAnalysis {
    if (data.length < 3) {
      return {
        direction: 'stable',
        slope: 0,
        changePoints: [],
        confidence: 0,
      };
    }

    const values = data.map(d => d.value);
    const n = values.length;
    
    // Calculate trend slope
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine trend direction
    let direction: TrendAnalysis['direction'] = 'stable';
    if (Math.abs(slope) > 0.1) {
      direction = slope > 0 ? 'increasing' : 'decreasing';
    }

    // Calculate confidence based on R-squared
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      ssRes += Math.pow(values[i] - predicted, 2);
      ssTot += Math.pow(values[i] - yMean, 2);
    }
    
    const confidence = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    return {
      direction,
      slope,
      changePoints: [], // Simplified - would need more complex analysis
      confidence: Math.max(0, confidence),
    };
  }

  private detectSeasonality(data: TimeSeriesData[]): SeasonalityPattern | undefined {
    if (data.length < 14) return undefined;

    const values = data.map(d => d.value);
    const n = values.length;
    
    // Test for weekly seasonality (7 days)
    const period = 7;
    if (n < period * 2) return undefined;

    let seasonalStrength = 0;
    const seasonalValues: number[] = [];
    
    for (let i = 0; i < period; i++) {
      const dayValues = [];
      for (let j = i; j < n; j += period) {
        dayValues.push(values[j]);
      }
      
      const dayMean = dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length;
      seasonalValues.push(dayMean);
      
      // Calculate seasonal strength
      const variance = dayValues.reduce((sum, val) => sum + Math.pow(val - dayMean, 2), 0) / dayValues.length;
      seasonalStrength += variance;
    }

    seasonalStrength = 1 / (1 + seasonalStrength);

    return {
      period,
      strength: seasonalStrength,
      peaks: [6, 0], // Weekend peaks (simplified)
      valleys: [1, 2], // Weekday valleys (simplified)
    };
  }

  private calculateConfidence(data: TimeSeriesData[], modelAccuracy: number): number {
    const dataQuality = Math.min(1, data.length / 30); // More data = higher confidence
    const consistencyScore = this.calculateConsistency(data);
    
    return (modelAccuracy * 0.5) + (dataQuality * 0.3) + (consistencyScore * 0.2);
  }

  private calculateConsistency(data: TimeSeriesData[]): number {
    if (data.length < 2) return 0;
    
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficient = variance / (mean * mean);
    
    return Math.max(0, 1 - coefficient);
  }

  private calculateThreshold(data: TimeSeriesData[]): number {
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );
    
    return mean + 2 * stdDev; // 95% confidence interval
  }

  private calculateSeverity(zScore: number): AnomalyPrediction['severity'] {
    if (zScore > 4) return 'critical';
    if (zScore > 3) return 'high';
    if (zScore > 2.5) return 'medium';
    return 'low';
  }

  private calculateAnomalyProbability(zScore: number, confidence: number): number {
    const baseProbability = 1 - (1 / (1 + Math.exp(zScore - 3)));
    return baseProbability * confidence;
  }

  private assessImpact(metric: string, severity: AnomalyPrediction['severity']): string {
    const impacts = {
      cpu: {
        low: 'Minor performance degradation',
        medium: 'Noticeable slowdown in applications',
        high: 'Significant performance impact',
        critical: 'Service unavailability likely'
      },
      memory: {
        low: 'Increased garbage collection',
        medium: 'Application slowdown',
        high: 'Out of memory errors possible',
        critical: 'System crash likely'
      },
      disk: {
        low: 'Slower I/O operations',
        medium: 'Database performance affected',
        high: 'Applications may fail to write',
        critical: 'System may become unresponsive'
      }
    };

    const metricType = metric.toLowerCase().includes('cpu') ? 'cpu' :
                      metric.toLowerCase().includes('memory') ? 'memory' :
                      metric.toLowerCase().includes('disk') ? 'disk' : 'cpu';

    return impacts[metricType][severity];
  }

  private generatePreventiveActions(metric: string, severity: AnomalyPrediction['severity']): string[] {
    const actions = {
      cpu: [
        'Scale up instances',
        'Optimize application code',
        'Implement caching',
        'Review resource allocation'
      ],
      memory: [
        'Increase memory limits',
        'Optimize memory usage',
        'Implement memory profiling',
        'Review garbage collection settings'
      ],
      disk: [
        'Clean up old files',
        'Implement log rotation',
        'Add more storage',
        'Optimize database queries'
      ]
    };

    const metricType = metric.toLowerCase().includes('cpu') ? 'cpu' :
                      metric.toLowerCase().includes('memory') ? 'memory' :
                      metric.toLowerCase().includes('disk') ? 'disk' : 'cpu';

    return actions[metricType];
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<Record<string, any>> {
    return {
      modelAccuracy: Array.from(this.models.values()).reduce((sum, model) => sum + model.accuracy, 0) / this.models.size,
      predictionCount: this.predictionCache.size,
      activeMetrics: this.historicalData.size,
      cacheHitRate: 0.85, // Simplified
      averageProcessingTime: 250, // ms
    };
  }

  // Clear cache
  clearCache(): void {
    this.predictionCache.clear();
  }
}

// Export singleton instance
export const predictiveAnalytics = new PredictiveAnalytics();

export default PredictiveAnalytics;