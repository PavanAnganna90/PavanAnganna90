/**
 * React hook for real-time dashboard metrics
 * Provides live system metrics with automatic reconnection
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeService, RealtimeMetrics, RealtimeDeployment, RealtimeAlert } from '@/services/realtimeService';
import { useAuth } from '@/contexts/AuthContext';

export interface RealtimeData {
  metrics: RealtimeMetrics | null;
  deployments: RealtimeDeployment[];
  alerts: RealtimeAlert[];
  connected: boolean;
  connectionState: 'connecting' | 'open' | 'closing' | 'closed';
  lastUpdate: Date | null;
}

export interface UseRealTimeMetricsOptions {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
  requestInterval?: number;
}

export function useRealTimeMetrics(options: UseRealTimeMetricsOptions = {}) {
  const {
    autoConnect = true,
    reconnectOnMount = true,
    requestInterval = 5000
  } = options;

  const { state: authState } = useAuth();
  const [data, setData] = useState<RealtimeData>({
    metrics: null,
    deployments: [],
    alerts: [],
    connected: false,
    connectionState: 'closed',
    lastUpdate: null
  });

  const [error, setError] = useState<string | null>(null);
  const requestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Update connection state
   */
  const updateConnectionState = useCallback(() => {
    setData(prev => ({
      ...prev,
      connected: realtimeService.isConnected(),
      connectionState: realtimeService.getConnectionState()
    }));
  }, []);

  /**
   * Connect to real-time service
   */
  const connect = useCallback(async () => {
    try {
      setError(null);
      const token = authState.tokens?.access_token;
      await realtimeService.connect(token);
      updateConnectionState();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
      console.error('Failed to connect to real-time service:', error);
    }
  }, [authState.tokens?.access_token, updateConnectionState]);

  /**
   * Disconnect from real-time service
   */
  const disconnect = useCallback(() => {
    realtimeService.disconnect();
    updateConnectionState();
    
    // Clear intervals
    if (requestIntervalRef.current) {
      clearInterval(requestIntervalRef.current);
      requestIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [updateConnectionState]);

  /**
   * Request fresh data from server
   */
  const requestUpdate = useCallback(() => {
    if (realtimeService.isConnected()) {
      realtimeService.requestMetrics();
      realtimeService.requestDeploymentStatus();
      realtimeService.requestHealthStatus();
    }
  }, []);

  /**
   * Setup event listeners and auto-refresh
   */
  useEffect(() => {
    // Subscribe to metrics updates
    const unsubscribeMetrics = realtimeService.subscribe('metrics', (metrics: RealtimeMetrics) => {
      setData(prev => ({
        ...prev,
        metrics,
        lastUpdate: new Date()
      }));
    });

    // Subscribe to deployment updates
    const unsubscribeDeployments = realtimeService.subscribe('deployment', (deployment: RealtimeDeployment) => {
      setData(prev => ({
        ...prev,
        deployments: [deployment, ...prev.deployments.slice(0, 9)], // Keep last 10
        lastUpdate: new Date()
      }));
    });

    // Subscribe to alert updates
    const unsubscribeAlerts = realtimeService.subscribe('alert', (alert: RealtimeAlert) => {
      setData(prev => ({
        ...prev,
        alerts: [alert, ...prev.alerts.slice(0, 19)], // Keep last 20
        lastUpdate: new Date()
      }));
    });

    // Subscribe to health updates
    const unsubscribeHealth = realtimeService.subscribe('health', (healthData: any) => {
      setData(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeDeployments();
      unsubscribeAlerts();
      unsubscribeHealth();
    };
  }, []);

  /**
   * Auto-connect when authenticated
   */
  useEffect(() => {
    if (autoConnect && authState.isAuthenticated && !authState.isLoading) {
      connect();
    } else if (!authState.isAuthenticated) {
      disconnect();
    }
  }, [autoConnect, authState.isAuthenticated, authState.isLoading, connect, disconnect]);

  /**
   * Setup periodic data requests
   */
  useEffect(() => {
    if (realtimeService.isConnected() && requestInterval > 0) {
      requestIntervalRef.current = setInterval(() => {
        requestUpdate();
      }, requestInterval);

      // Initial request
      requestUpdate();

      return () => {
        if (requestIntervalRef.current) {
          clearInterval(requestIntervalRef.current);
          requestIntervalRef.current = null;
        }
      };
    }
  }, [data.connected, requestInterval, requestUpdate]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (requestIntervalRef.current) {
        clearInterval(requestIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Monitor connection state changes
   */
  useEffect(() => {
    const checkConnection = () => {
      updateConnectionState();
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [updateConnectionState]);

  return {
    data,
    error,
    connect,
    disconnect,
    requestUpdate,
    isConnected: data.connected,
    connectionState: data.connectionState
  };
}

export default useRealTimeMetrics;