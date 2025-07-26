"""
OpsSight Advanced Analytics Engine - v2.0.0
Machine learning-powered analytics with predictive insights and historical trend analysis

Features:
- Time series analysis and forecasting
- Anomaly detection using statistical models
- Predictive alerting and capacity planning
- Performance trend analysis
- Root cause analysis automation
- Custom metric correlation analysis
- Real-time analytics processing
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
import json
import uuid
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.cluster import DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib
import warnings
warnings.filterwarnings('ignore')

# Database imports
from services.data_access import AsyncSessionLocal, metric_repository, alert_repository
from database import Metric, Service, Alert, Organization

# Configure logging
logger = logging.getLogger(__name__)

class AnalyticsTimeRange(Enum):
    """Time range options for analytics"""
    LAST_HOUR = "1h"
    LAST_6_HOURS = "6h"
    LAST_24_HOURS = "24h"
    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"
    LAST_90_DAYS = "90d"

class PredictionHorizon(Enum):
    """Prediction horizon options"""
    NEXT_HOUR = "1h"
    NEXT_6_HOURS = "6h"
    NEXT_24_HOURS = "24h"
    NEXT_7_DAYS = "7d"
    NEXT_30_DAYS = "30d"

class AnomalyType(Enum):
    """Types of anomalies detected"""
    SPIKE = "spike"
    DROP = "drop"
    DRIFT = "drift"
    OUTLIER = "outlier"
    PATTERN_BREAK = "pattern_break"

@dataclass
class TimeSeriesData:
    """Time series data container"""
    timestamps: List[datetime]
    values: List[float]
    metric_name: str
    service_id: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AnomalyResult:
    """Anomaly detection result"""
    timestamp: datetime
    value: float
    anomaly_score: float
    anomaly_type: AnomalyType
    severity: str  # 'low', 'medium', 'high', 'critical'
    confidence: float
    context: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PredictionResult:
    """Prediction result"""
    timestamp: datetime
    predicted_value: float
    confidence_interval: Tuple[float, float]
    prediction_horizon: str
    model_accuracy: float
    feature_importance: Dict[str, float] = field(default_factory=dict)

@dataclass
class TrendAnalysis:
    """Trend analysis result"""
    metric_name: str
    service_id: str
    time_range: str
    trend_direction: str  # 'increasing', 'decreasing', 'stable', 'volatile'
    trend_strength: float  # 0-1 scale
    seasonal_patterns: Dict[str, Any] = field(default_factory=dict)
    change_points: List[datetime] = field(default_factory=list)
    summary: str = ""

@dataclass
class CorrelationAnalysis:
    """Correlation analysis result"""
    primary_metric: str
    correlated_metrics: List[Dict[str, Any]]
    correlation_strength: float
    causality_direction: Optional[str] = None
    lag_minutes: int = 0

class MetricPreprocessor:
    """Handles metric data preprocessing and feature engineering"""
    
    def __init__(self):
        self.scalers = {}
        self.feature_columns = [
            'hour_of_day', 'day_of_week', 'day_of_month', 'month',
            'is_weekend', 'is_business_hour'
        ]
    
    def preprocess_timeseries(self, data: TimeSeriesData) -> pd.DataFrame:
        """Preprocess time series data for analysis"""
        df = pd.DataFrame({
            'timestamp': data.timestamps,
            'value': data.values
        })
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('timestamp').sort_index()
        
        # Remove duplicates and handle missing values
        df = df[~df.index.duplicated(keep='first')]
        df['value'] = df['value'].interpolate(method='linear')
        
        # Feature engineering
        df['hour_of_day'] = df.index.hour
        df['day_of_week'] = df.index.dayofweek
        df['day_of_month'] = df.index.day
        df['month'] = df.index.month
        df['is_weekend'] = (df.index.dayofweek >= 5).astype(int)
        df['is_business_hour'] = ((df.index.hour >= 9) & (df.index.hour < 17)).astype(int)
        
        # Rolling statistics
        df['rolling_mean_1h'] = df['value'].rolling(window=12, min_periods=1).mean()  # 5min intervals
        df['rolling_std_1h'] = df['value'].rolling(window=12, min_periods=1).std()
        df['rolling_mean_24h'] = df['value'].rolling(window=288, min_periods=1).mean()
        
        # Lag features
        df['value_lag_1'] = df['value'].shift(1)
        df['value_lag_12'] = df['value'].shift(12)  # 1 hour lag
        df['value_lag_288'] = df['value'].shift(288)  # 24 hour lag
        
        # Rate of change
        df['rate_of_change'] = df['value'].pct_change()
        df['rate_of_change_smoothed'] = df['rate_of_change'].rolling(window=6, min_periods=1).mean()
        
        return df.fillna(method='bfill').fillna(method='ffill')
    
    def scale_features(self, df: pd.DataFrame, metric_name: str) -> pd.DataFrame:
        """Scale features for machine learning"""
        scaler_key = f"{metric_name}_scaler"
        
        if scaler_key not in self.scalers:
            self.scalers[scaler_key] = StandardScaler()
            scaled_values = self.scalers[scaler_key].fit_transform(df[['value']])
        else:
            scaled_values = self.scalers[scaler_key].transform(df[['value']])
        
        df['value_scaled'] = scaled_values.flatten()
        return df

class AnomalyDetector:
    """Advanced anomaly detection using multiple algorithms"""
    
    def __init__(self):
        self.models = {}
        self.preprocessor = MetricPreprocessor()
    
    async def detect_anomalies(self, data: TimeSeriesData, 
                             sensitivity: float = 0.1) -> List[AnomalyResult]:
        """Detect anomalies in time series data"""
        try:
            df = self.preprocessor.preprocess_timeseries(data)
            if len(df) < 20:  # Need minimum data points
                return []
            
            anomalies = []
            
            # Statistical anomaly detection
            statistical_anomalies = await self._detect_statistical_anomalies(df, sensitivity)
            anomalies.extend(statistical_anomalies)
            
            # Machine learning anomaly detection
            ml_anomalies = await self._detect_ml_anomalies(df, data.metric_name, sensitivity)
            anomalies.extend(ml_anomalies)
            
            # Pattern-based anomaly detection
            pattern_anomalies = await self._detect_pattern_anomalies(df, sensitivity)
            anomalies.extend(pattern_anomalies)
            
            # Deduplicate and rank anomalies
            unique_anomalies = self._deduplicate_anomalies(anomalies)
            
            logger.info(f"Detected {len(unique_anomalies)} anomalies for {data.metric_name}")
            return unique_anomalies
            
        except Exception as e:
            logger.error(f"Anomaly detection failed for {data.metric_name}: {e}")
            return []
    
    async def _detect_statistical_anomalies(self, df: pd.DataFrame, 
                                          sensitivity: float) -> List[AnomalyResult]:
        """Detect anomalies using statistical methods"""
        anomalies = []
        
        # Z-score based detection
        z_scores = np.abs((df['value'] - df['value'].mean()) / df['value'].std())
        threshold = 3.0 * (1 - sensitivity)  # More sensitive = lower threshold
        
        for idx, z_score in enumerate(z_scores):
            if z_score > threshold:
                timestamp = df.index[idx]
                value = df['value'].iloc[idx]
                
                # Determine anomaly type
                if value > df['value'].mean():
                    anomaly_type = AnomalyType.SPIKE
                else:
                    anomaly_type = AnomalyType.DROP
                
                # Calculate severity
                severity = self._calculate_severity(z_score, threshold)
                
                anomalies.append(AnomalyResult(
                    timestamp=timestamp,
                    value=value,
                    anomaly_score=z_score,
                    anomaly_type=anomaly_type,
                    severity=severity,
                    confidence=min(z_score / 10.0, 1.0),
                    context={'method': 'z_score', 'threshold': threshold}
                ))
        
        return anomalies
    
    async def _detect_ml_anomalies(self, df: pd.DataFrame, metric_name: str,
                                 sensitivity: float) -> List[AnomalyResult]:
        """Detect anomalies using machine learning"""
        anomalies = []
        
        try:
            # Prepare features
            feature_cols = ['value', 'hour_of_day', 'day_of_week', 'rolling_mean_1h', 
                          'rolling_std_1h', 'rate_of_change']
            features = df[feature_cols].fillna(0)
            
            if len(features) < 50:  # Need sufficient data for ML
                return anomalies
            
            # Isolation Forest
            contamination = sensitivity * 0.5  # Convert sensitivity to contamination rate
            isolation_forest = IsolationForest(
                contamination=contamination,
                random_state=42,
                n_estimators=100
            )
            
            anomaly_scores = isolation_forest.fit_predict(features)
            decision_scores = isolation_forest.decision_function(features)
            
            for idx, (score, decision) in enumerate(zip(anomaly_scores, decision_scores)):
                if score == -1:  # Anomaly detected
                    timestamp = df.index[idx]
                    value = df['value'].iloc[idx]
                    
                    # Determine anomaly type based on value context
                    recent_mean = df['rolling_mean_1h'].iloc[idx]
                    if value > recent_mean * 1.2:
                        anomaly_type = AnomalyType.SPIKE
                    elif value < recent_mean * 0.8:
                        anomaly_type = AnomalyType.DROP
                    else:
                        anomaly_type = AnomalyType.OUTLIER
                    
                    severity = self._calculate_severity(abs(decision), 0.1)
                    
                    anomalies.append(AnomalyResult(
                        timestamp=timestamp,
                        value=value,
                        anomaly_score=abs(decision),
                        anomaly_type=anomaly_type,
                        severity=severity,
                        confidence=min(abs(decision) * 2, 1.0),
                        context={'method': 'isolation_forest', 'decision_score': decision}
                    ))
            
        except Exception as e:
            logger.error(f"ML anomaly detection failed: {e}")
        
        return anomalies
    
    async def _detect_pattern_anomalies(self, df: pd.DataFrame,
                                      sensitivity: float) -> List[AnomalyResult]:
        """Detect pattern-based anomalies"""
        anomalies = []
        
        try:
            # Detect sudden changes in trend
            df['trend_change'] = df['value'].diff().diff()
            trend_threshold = df['trend_change'].std() * (3 - sensitivity * 2)
            
            for idx in range(2, len(df)):
                trend_change = abs(df['trend_change'].iloc[idx])
                if trend_change > trend_threshold:
                    timestamp = df.index[idx]
                    value = df['value'].iloc[idx]
                    
                    anomalies.append(AnomalyResult(
                        timestamp=timestamp,
                        value=value,
                        anomaly_score=trend_change / trend_threshold,
                        anomaly_type=AnomalyType.PATTERN_BREAK,
                        severity=self._calculate_severity(trend_change, trend_threshold),
                        confidence=min(trend_change / (trend_threshold * 2), 1.0),
                        context={'method': 'pattern_break', 'trend_change': trend_change}
                    ))
            
        except Exception as e:
            logger.error(f"Pattern anomaly detection failed: {e}")
        
        return anomalies
    
    def _calculate_severity(self, score: float, threshold: float) -> str:
        """Calculate anomaly severity based on score"""
        ratio = score / threshold
        if ratio > 5:
            return 'critical'
        elif ratio > 3:
            return 'high'
        elif ratio > 2:
            return 'medium'
        else:
            return 'low'
    
    def _deduplicate_anomalies(self, anomalies: List[AnomalyResult],
                             time_window_minutes: int = 15) -> List[AnomalyResult]:
        """Remove duplicate anomalies within time window"""
        if not anomalies:
            return []
        
        # Sort by timestamp
        sorted_anomalies = sorted(anomalies, key=lambda x: x.timestamp)
        unique_anomalies = [sorted_anomalies[0]]
        
        for anomaly in sorted_anomalies[1:]:
            # Check if this anomaly is too close to the last one
            time_diff = (anomaly.timestamp - unique_anomalies[-1].timestamp).total_seconds() / 60
            
            if time_diff > time_window_minutes:
                unique_anomalies.append(anomaly)
            elif anomaly.anomaly_score > unique_anomalies[-1].anomaly_score:
                # Replace with higher scoring anomaly
                unique_anomalies[-1] = anomaly
        
        return unique_anomalies

class PredictiveAnalytics:
    """Predictive analytics and forecasting"""
    
    def __init__(self):
        self.models = {}
        self.preprocessor = MetricPreprocessor()
    
    async def forecast_metric(self, data: TimeSeriesData, 
                            horizon: PredictionHorizon) -> List[PredictionResult]:
        """Forecast metric values using machine learning"""
        try:
            df = self.preprocessor.preprocess_timeseries(data)
            if len(df) < 100:  # Need sufficient historical data
                return []
            
            # Prepare training data
            train_size = int(len(df) * 0.8)
            train_df = df.iloc[:train_size]
            test_df = df.iloc[train_size:]
            
            # Feature selection
            feature_cols = [
                'hour_of_day', 'day_of_week', 'day_of_month', 'month',
                'is_weekend', 'is_business_hour', 'rolling_mean_1h',
                'rolling_std_1h', 'value_lag_1', 'value_lag_12', 'value_lag_288'
            ]
            
            X_train = train_df[feature_cols].fillna(0)
            y_train = train_df['value']
            X_test = test_df[feature_cols].fillna(0)
            y_test = test_df['value']
            
            # Train model
            model_key = f"{data.metric_name}_{data.service_id}_forecast"
            if model_key not in self.models:
                self.models[model_key] = RandomForestRegressor(
                    n_estimators=100,
                    random_state=42,
                    n_jobs=-1
                )
                self.models[model_key].fit(X_train, y_train)
            
            model = self.models[model_key]
            
            # Calculate model accuracy
            y_pred_test = model.predict(X_test)
            accuracy = 1 - (mean_absolute_error(y_test, y_pred_test) / y_test.mean())
            accuracy = max(0, min(1, accuracy))  # Clamp between 0 and 1
            
            # Generate future predictions
            predictions = await self._generate_predictions(
                df, model, feature_cols, horizon, accuracy
            )
            
            logger.info(f"Generated {len(predictions)} predictions for {data.metric_name}")
            return predictions
            
        except Exception as e:
            logger.error(f"Forecasting failed for {data.metric_name}: {e}")
            return []
    
    async def _generate_predictions(self, df: pd.DataFrame, model, 
                                  feature_cols: List[str], horizon: PredictionHorizon,
                                  accuracy: float) -> List[PredictionResult]:
        """Generate future predictions"""
        predictions = []
        
        # Determine prediction steps
        horizon_minutes = {
            PredictionHorizon.NEXT_HOUR: 60,
            PredictionHorizon.NEXT_6_HOURS: 360,
            PredictionHorizon.NEXT_24_HOURS: 1440,
            PredictionHorizon.NEXT_7_DAYS: 10080,
            PredictionHorizon.NEXT_30_DAYS: 43200
        }
        
        steps = horizon_minutes[horizon] // 5  # 5-minute intervals
        current_time = df.index[-1]
        
        # Use last known values as starting point
        last_features = df[feature_cols].iloc[-1].copy()
        
        for step in range(1, min(steps + 1, 500)):  # Limit to prevent excessive computation
            # Update time-based features
            future_time = current_time + timedelta(minutes=5 * step)
            last_features['hour_of_day'] = future_time.hour
            last_features['day_of_week'] = future_time.dayofweek
            last_features['day_of_month'] = future_time.day
            last_features['month'] = future_time.month
            last_features['is_weekend'] = int(future_time.dayofweek >= 5)
            last_features['is_business_hour'] = int(9 <= future_time.hour < 17)
            
            # Make prediction
            pred_value = model.predict([last_features.values])[0]
            
            # Calculate confidence interval (simplified)
            prediction_error = df['value'].std() * (1 - accuracy)
            confidence_interval = (
                pred_value - 1.96 * prediction_error,
                pred_value + 1.96 * prediction_error
            )
            
            # Get feature importance
            feature_importance = dict(zip(feature_cols, model.feature_importances_))
            
            predictions.append(PredictionResult(
                timestamp=future_time,
                predicted_value=pred_value,
                confidence_interval=confidence_interval,
                prediction_horizon=horizon.value,
                model_accuracy=accuracy,
                feature_importance=feature_importance
            ))
            
            # Update lag features for next prediction
            last_features['value_lag_1'] = pred_value
            if step >= 12:  # 1 hour
                last_features['value_lag_12'] = predictions[step - 12].predicted_value
            if step >= 288:  # 24 hours
                last_features['value_lag_288'] = predictions[step - 288].predicted_value
        
        return predictions

class TrendAnalyzer:
    """Analyze trends and patterns in metrics"""
    
    def __init__(self):
        self.preprocessor = MetricPreprocessor()
    
    async def analyze_trends(self, data: TimeSeriesData, 
                           time_range: AnalyticsTimeRange) -> TrendAnalysis:
        """Analyze trends in time series data"""
        try:
            df = self.preprocessor.preprocess_timeseries(data)
            if len(df) < 10:
                return TrendAnalysis(
                    metric_name=data.metric_name,
                    service_id=data.service_id,
                    time_range=time_range.value,
                    trend_direction='insufficient_data',
                    trend_strength=0.0,
                    summary="Insufficient data for trend analysis"
                )
            
            # Calculate trend direction and strength
            trend_direction, trend_strength = self._calculate_trend(df['value'])
            
            # Detect seasonal patterns
            seasonal_patterns = self._detect_seasonal_patterns(df)
            
            # Detect change points
            change_points = self._detect_change_points(df)
            
            # Generate summary
            summary = self._generate_trend_summary(
                trend_direction, trend_strength, seasonal_patterns, change_points
            )
            
            return TrendAnalysis(
                metric_name=data.metric_name,
                service_id=data.service_id,
                time_range=time_range.value,
                trend_direction=trend_direction,
                trend_strength=trend_strength,
                seasonal_patterns=seasonal_patterns,
                change_points=change_points,
                summary=summary
            )
            
        except Exception as e:
            logger.error(f"Trend analysis failed for {data.metric_name}: {e}")
            return TrendAnalysis(
                metric_name=data.metric_name,
                service_id=data.service_id,
                time_range=time_range.value,
                trend_direction='error',
                trend_strength=0.0,
                summary=f"Analysis failed: {str(e)}"
            )
    
    def _calculate_trend(self, values: pd.Series) -> Tuple[str, float]:
        """Calculate trend direction and strength"""
        # Linear regression slope
        x = np.arange(len(values))
        slope, _ = np.polyfit(x, values, 1)
        
        # Normalize slope by value range
        value_range = values.max() - values.min()
        if value_range > 0:
            normalized_slope = slope / value_range
        else:
            normalized_slope = 0
        
        # Determine direction
        if abs(normalized_slope) < 0.01:
            direction = 'stable'
        elif normalized_slope > 0:
            direction = 'increasing'
        else:
            direction = 'decreasing'
        
        # Calculate strength (0-1)
        strength = min(abs(normalized_slope) * 100, 1.0)
        
        # Check for volatility
        volatility = values.std() / values.mean() if values.mean() != 0 else 0
        if volatility > 0.5:
            direction = 'volatile'
            strength = volatility
        
        return direction, strength
    
    def _detect_seasonal_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect seasonal patterns in data"""
        patterns = {}
        
        try:
            # Daily patterns
            if len(df) >= 24 * 12:  # At least 24 hours of 5-min data
                hourly_means = df.groupby('hour_of_day')['value'].mean()
                patterns['daily'] = {
                    'peak_hour': int(hourly_means.idxmax()),
                    'low_hour': int(hourly_means.idxmin()),
                    'variation': float(hourly_means.std() / hourly_means.mean())
                }
            
            # Weekly patterns
            if len(df) >= 7 * 24 * 12:  # At least 7 days
                daily_means = df.groupby('day_of_week')['value'].mean()
                patterns['weekly'] = {
                    'peak_day': int(daily_means.idxmax()),
                    'low_day': int(daily_means.idxmin()),
                    'weekend_factor': float(daily_means[5:].mean() / daily_means[:5].mean())
                }
            
        except Exception as e:
            logger.warning(f"Seasonal pattern detection failed: {e}")
        
        return patterns
    
    def _detect_change_points(self, df: pd.DataFrame) -> List[datetime]:
        """Detect significant change points in the data"""
        change_points = []
        
        try:
            values = df['value'].values
            if len(values) < 20:
                return change_points
            
            # Simple change point detection using moving window variance
            window_size = min(20, len(values) // 10)
            
            for i in range(window_size, len(values) - window_size):
                before_var = np.var(values[i-window_size:i])
                after_var = np.var(values[i:i+window_size])
                
                # Significant change in variance
                if before_var > 0 and after_var > 0:
                    variance_ratio = max(before_var, after_var) / min(before_var, after_var)
                    if variance_ratio > 3:  # Significant change
                        change_points.append(df.index[i])
            
        except Exception as e:
            logger.warning(f"Change point detection failed: {e}")
        
        return change_points
    
    def _generate_trend_summary(self, direction: str, strength: float,
                              seasonal_patterns: Dict[str, Any],
                              change_points: List[datetime]) -> str:
        """Generate human-readable trend summary"""
        summary_parts = []
        
        # Trend direction
        if direction == 'increasing':
            summary_parts.append(f"Showing an upward trend (strength: {strength:.2f})")
        elif direction == 'decreasing':
            summary_parts.append(f"Showing a downward trend (strength: {strength:.2f})")
        elif direction == 'stable':
            summary_parts.append("Remaining relatively stable")
        elif direction == 'volatile':
            summary_parts.append(f"Highly volatile with significant fluctuations (volatility: {strength:.2f})")
        
        # Seasonal patterns
        if 'daily' in seasonal_patterns:
            daily = seasonal_patterns['daily']
            summary_parts.append(f"Daily peak at hour {daily['peak_hour']}, low at hour {daily['low_hour']}")
        
        if 'weekly' in seasonal_patterns:
            weekly = seasonal_patterns['weekly']
            days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            summary_parts.append(f"Weekly peak on {days[weekly['peak_day']]}")
        
        # Change points
        if change_points:
            summary_parts.append(f"Significant changes detected at {len(change_points)} time points")
        
        return "; ".join(summary_parts) if summary_parts else "No significant patterns detected"

class CorrelationAnalyzer:
    """Analyze correlations between different metrics"""
    
    async def analyze_correlations(self, primary_metric: str, 
                                 metrics_data: List[TimeSeriesData],
                                 min_correlation: float = 0.5) -> List[CorrelationAnalysis]:
        """Analyze correlations between metrics"""
        correlations = []
        
        try:
            # Find primary metric data
            primary_data = None
            for data in metrics_data:
                if data.metric_name == primary_metric:
                    primary_data = data
                    break
            
            if not primary_data:
                return correlations
            
            # Create primary DataFrame
            primary_df = pd.DataFrame({
                'timestamp': primary_data.timestamps,
                'value': primary_data.values
            })
            primary_df['timestamp'] = pd.to_datetime(primary_df['timestamp'])
            primary_df = primary_df.set_index('timestamp').sort_index()
            
            # Analyze correlations with other metrics
            for data in metrics_data:
                if data.metric_name == primary_metric:
                    continue
                
                correlation = await self._calculate_correlation(primary_df, data)
                if correlation and abs(correlation.correlation_strength) >= min_correlation:
                    correlations.append(correlation)
            
            # Sort by correlation strength
            correlations.sort(key=lambda x: abs(x.correlation_strength), reverse=True)
            
        except Exception as e:
            logger.error(f"Correlation analysis failed: {e}")
        
        return correlations
    
    async def _calculate_correlation(self, primary_df: pd.DataFrame,
                                   secondary_data: TimeSeriesData) -> Optional[CorrelationAnalysis]:
        """Calculate correlation between two metrics"""
        try:
            # Create secondary DataFrame
            secondary_df = pd.DataFrame({
                'timestamp': secondary_data.timestamps,
                'value': secondary_data.values
            })
            secondary_df['timestamp'] = pd.to_datetime(secondary_df['timestamp'])
            secondary_df = secondary_df.set_index('timestamp').sort_index()
            
            # Align timestamps (inner join)
            aligned = primary_df.join(secondary_df, how='inner', rsuffix='_secondary')
            
            if len(aligned) < 10:  # Need minimum data points
                return None
            
            # Calculate Pearson correlation
            correlation = aligned['value'].corr(aligned['value_secondary'])
            
            if abs(correlation) < 0.1:  # Too weak
                return None
            
            # Find optimal lag (simple approach)
            best_lag = 0
            best_correlation = abs(correlation)
            
            for lag in range(1, min(25, len(aligned) // 4)):  # Check up to 25 time steps
                lagged_correlation = aligned['value'].corr(aligned['value_secondary'].shift(lag))
                if abs(lagged_correlation) > best_correlation:
                    best_correlation = abs(lagged_correlation)
                    best_lag = lag
                    correlation = lagged_correlation
            
            # Build correlated metrics info
            correlated_metrics = [{
                'metric_name': secondary_data.metric_name,
                'service_id': secondary_data.service_id,
                'correlation': correlation,
                'lag_minutes': best_lag * 5  # Assuming 5-minute intervals
            }]
            
            return CorrelationAnalysis(
                primary_metric=primary_df.name if hasattr(primary_df, 'name') else 'primary',
                correlated_metrics=correlated_metrics,
                correlation_strength=correlation,
                causality_direction='positive' if correlation > 0 else 'negative',
                lag_minutes=best_lag * 5
            )
            
        except Exception as e:
            logger.error(f"Correlation calculation failed: {e}")
            return None

class AdvancedAnalyticsEngine:
    """Main analytics engine orchestrating all analysis components"""
    
    def __init__(self):
        self.anomaly_detector = AnomalyDetector()
        self.predictive_analytics = PredictiveAnalytics()
        self.trend_analyzer = TrendAnalyzer()
        self.correlation_analyzer = CorrelationAnalyzer()
    
    async def get_metrics_data(self, service_id: str, metric_name: str,
                             time_range: AnalyticsTimeRange,
                             org_id: uuid.UUID) -> Optional[TimeSeriesData]:
        """Retrieve metrics data from database"""
        try:
            # Calculate time boundaries
            end_time = datetime.utcnow()
            time_deltas = {
                AnalyticsTimeRange.LAST_HOUR: timedelta(hours=1),
                AnalyticsTimeRange.LAST_6_HOURS: timedelta(hours=6),
                AnalyticsTimeRange.LAST_24_HOURS: timedelta(hours=24),
                AnalyticsTimeRange.LAST_7_DAYS: timedelta(days=7),
                AnalyticsTimeRange.LAST_30_DAYS: timedelta(days=30),
                AnalyticsTimeRange.LAST_90_DAYS: timedelta(days=90)
            }
            
            start_time = end_time - time_deltas[time_range]
            
            # Query metrics from database
            async with AsyncSessionLocal() as session:
                from sqlalchemy.sql import select
                from sqlalchemy import and_
                
                query = select(Metric).where(
                    and_(
                        Metric.organization_id == org_id,
                        Metric.service_id == service_id,
                        Metric.name == metric_name,
                        Metric.timestamp >= start_time,
                        Metric.timestamp <= end_time
                    )
                ).order_by(Metric.timestamp)
                
                result = await session.execute(query)
                metrics = result.scalars().all()
                
                if not metrics:
                    return None
                
                return TimeSeriesData(
                    timestamps=[m.timestamp for m in metrics],
                    values=[float(m.value) for m in metrics],
                    metric_name=metric_name,
                    service_id=service_id,
                    metadata={'time_range': time_range.value, 'count': len(metrics)}
                )
                
        except Exception as e:
            logger.error(f"Failed to get metrics data: {e}")
            return None
    
    async def comprehensive_analysis(self, service_id: str, metric_name: str,
                                   time_range: AnalyticsTimeRange,
                                   org_id: uuid.UUID) -> Dict[str, Any]:
        """Perform comprehensive analysis on a metric"""
        try:
            # Get data
            data = await self.get_metrics_data(service_id, metric_name, time_range, org_id)
            if not data:
                return {'error': 'No data available for analysis'}
            
            # Run all analyses in parallel
            results = await asyncio.gather(
                self.anomaly_detector.detect_anomalies(data),
                self.predictive_analytics.forecast_metric(data, PredictionHorizon.NEXT_24_HOURS),
                self.trend_analyzer.analyze_trends(data, time_range),
                return_exceptions=True
            )
            
            anomalies, predictions, trends = results
            
            # Handle exceptions
            if isinstance(anomalies, Exception):
                logger.error(f"Anomaly detection failed: {anomalies}")
                anomalies = []
            
            if isinstance(predictions, Exception):
                logger.error(f"Prediction failed: {predictions}")
                predictions = []
            
            if isinstance(trends, Exception):
                logger.error(f"Trend analysis failed: {trends}")
                trends = TrendAnalysis(
                    metric_name=metric_name,
                    service_id=service_id,
                    time_range=time_range.value,
                    trend_direction='error',
                    trend_strength=0.0,
                    summary="Analysis failed"
                )
            
            # Compile results
            analysis_result = {
                'metric_name': metric_name,
                'service_id': service_id,
                'time_range': time_range.value,
                'data_points': len(data.timestamps),
                'analysis_timestamp': datetime.utcnow().isoformat(),
                'anomalies': {
                    'total_count': len(anomalies),
                    'by_severity': self._group_anomalies_by_severity(anomalies),
                    'recent_anomalies': [
                        {
                            'timestamp': a.timestamp.isoformat(),
                            'value': a.value,
                            'type': a.anomaly_type.value,
                            'severity': a.severity,
                            'confidence': a.confidence
                        } for a in anomalies[-10:]  # Last 10 anomalies
                    ]
                },
                'predictions': {
                    'total_count': len(predictions),
                    'next_24h_forecast': [
                        {
                            'timestamp': p.timestamp.isoformat(),
                            'predicted_value': p.predicted_value,
                            'confidence_interval': p.confidence_interval,
                            'model_accuracy': p.model_accuracy
                        } for p in predictions[:48]  # First 48 predictions (4 hours at 5-min intervals)
                    ]
                },
                'trends': {
                    'direction': trends.trend_direction,
                    'strength': trends.trend_strength,
                    'seasonal_patterns': trends.seasonal_patterns,
                    'change_points_count': len(trends.change_points),
                    'summary': trends.summary
                }
            }
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Comprehensive analysis failed: {e}")
            return {'error': f'Analysis failed: {str(e)}'}
    
    def _group_anomalies_by_severity(self, anomalies: List[AnomalyResult]) -> Dict[str, int]:
        """Group anomalies by severity level"""
        severity_counts = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
        for anomaly in anomalies:
            severity_counts[anomaly.severity] += 1
        return severity_counts

# Create global analytics engine instance
analytics_engine = AdvancedAnalyticsEngine()

logger.info("Advanced Analytics Engine initialized with ML-powered insights")