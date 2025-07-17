'use client';

import React, { useState } from 'react';
import { useWebSocketStatus, useWebSocketReconnection } from '../../hooks/useRealTimeData';

interface RealTimeIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export function RealTimeIndicator({ showDetails = false, className = '' }: RealTimeIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const status = useWebSocketStatus();
  const { isReconnecting, reconnectAll } = useWebSocketReconnection();

  const allConnected = Object.values(status).every(connected => connected);
  const anyConnected = Object.values(status).some(connected => connected);

  const getStatusColor = () => {
    if (isReconnecting) return 'amber';
    if (allConnected) return 'emerald';
    if (anyConnected) return 'amber';
    return 'red';
  };

  const getStatusText = () => {
    if (isReconnecting) return 'Reconnecting...';
    if (allConnected) return 'Real-time Connected';
    if (anyConnected) return 'Partial Connection';
    return 'Disconnected';
  };

  const statusColor = getStatusColor();

  if (showDetails) {
    return (
      <div className={`bg-kassow-darker/80 backdrop-blur-lg rounded-lg border border-gray-700/50 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Real-time Status</h3>
          <div className={`w-3 h-3 rounded-full bg-${statusColor}-500 ${isReconnecting || !allConnected ? 'animate-pulse' : ''}`}></div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Metrics</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full bg-${status.metrics ? 'emerald' : 'red'}-500`}></div>
              <span className={`text-${status.metrics ? 'emerald' : 'red'}-400`}>
                {status.metrics ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Notifications</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full bg-${status.notifications ? 'emerald' : 'red'}-500`}></div>
              <span className={`text-${status.notifications ? 'emerald' : 'red'}-400`}>
                {status.notifications ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {!allConnected && (
          <button
            onClick={reconnectAll}
            disabled={isReconnecting}
            className="w-full mt-3 py-2 px-3 bg-kassow-accent text-white text-sm rounded-md hover:bg-kassow-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isReconnecting ? 'Reconnecting...' : 'Reconnect All'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full bg-${statusColor}-500 ${isReconnecting || !allConnected ? 'animate-pulse' : ''} shadow-lg shadow-${statusColor}-500/50`}></div>
        <span className={`text-${statusColor}-400 text-sm font-medium`}>
          {getStatusText()}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-kassow-darker/95 backdrop-blur-lg border border-gray-600/50 rounded-lg p-3 shadow-xl min-w-[200px]">
            <div className="text-white font-medium mb-2">Connection Status</div>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Metrics:</span>
                <span className={`text-${status.metrics ? 'emerald' : 'red'}-400`}>
                  {status.metrics ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Notifications:</span>
                <span className={`text-${status.notifications ? 'emerald' : 'red'}-400`}>
                  {status.notifications ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {!allConnected && (
              <button
                onClick={reconnectAll}
                disabled={isReconnecting}
                className="w-full mt-2 py-1 px-2 bg-kassow-accent text-white text-xs rounded hover:bg-kassow-accent-hover disabled:opacity-50 transition-colors"
              >
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </button>
            )}
            
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-2 h-2 bg-kassow-darker/95 border-r border-b border-gray-600/50 rotate-45"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RealTimeIndicator;