/**
 * Offline Indicator Component
 * 
 * Visual indicator showing network status and offline capabilities:
 * - Network connection status
 * - Sync status and progress
 * - Pending actions counter
 * - Conflict notifications
 * - Manual sync trigger
 * - Offline mode toggle
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { offlineService, SyncStatus } from '@/services/offlineService';

interface OfflineIndicatorProps {
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = "",
  position = "top-right"
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingActions: 0,
    conflictCount: 0,
    syncInProgress: false
  });
  const [showDetails, setShowDetails] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeOffline = async () => {
      try {
        await offlineService.initialize();
        if (mounted) {
          setIsInitialized(true);
          const status = await offlineService.getSyncStatus();
          setSyncStatus(status);
        }
      } catch (error) {
        console.error('Failed to initialize offline service:', error);
      }
    };

    initializeOffline();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribeNetwork = offlineService.onNetworkChange((isOnline) => {
      setSyncStatus(prev => ({ ...prev, isOnline }));
    });

    const unsubscribeSync = offlineService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  }, [isInitialized]);

  const handleManualSync = async () => {
    if (!syncStatus.isOnline) return;
    
    try {
      await offlineService.syncPendingActions();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleClearOfflineData = async () => {
    if (confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        await offlineService.clearOfflineData();
        const status = await offlineService.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Failed to clear offline data:', error);
      }
    }
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-500';
    if (syncStatus.syncInProgress) return 'bg-yellow-500';
    if (syncStatus.pendingActions > 0) return 'bg-orange-500';
    if (syncStatus.conflictCount > 0) return 'bg-purple-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (syncStatus.pendingActions > 0) return `${syncStatus.pendingActions} pending`;
    if (syncStatus.conflictCount > 0) return `${syncStatus.conflictCount} conflicts`;
    return 'Online';
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
      {/* Status Indicator */}
      <div 
        className="relative"
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full shadow-lg transition-all duration-200 ${
            syncStatus.isOnline 
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white' 
              : 'bg-gray-900 text-white'
          }`}
        >
          {/* Status Dot */}
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}>
            {syncStatus.syncInProgress && (
              <div className="w-3 h-3 rounded-full bg-current animate-ping opacity-75"></div>
            )}
          </div>

          {/* Status Text */}
          <span className="text-sm font-medium">{getStatusText()}</span>

          {/* Notification Badge */}
          {(syncStatus.pendingActions > 0 || syncStatus.conflictCount > 0) && (
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {syncStatus.pendingActions + syncStatus.conflictCount}
              </span>
            </div>
          )}
        </button>

        {/* Details Panel */}
        {showDetails && (
          <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
            <div className="space-y-4">
              {/* Status Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Connection Status
                </h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {syncStatus.isOnline ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {/* Sync Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Sync Status
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    Last sync: {syncStatus.lastSyncTime 
                      ? format(syncStatus.lastSyncTime, 'MMM dd, HH:mm') 
                      : 'Never'
                    }
                  </div>
                  <div>Pending actions: {syncStatus.pendingActions}</div>
                  <div>Conflicts: {syncStatus.conflictCount}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={handleManualSync}
                  disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                >
                  {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={handleClearOfflineData}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* Offline Features */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Offline Features
                </h3>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>✓ Data caching</div>
                  <div>✓ Action queuing</div>
                  <div>✓ Background sync</div>
                  <div>✓ Conflict resolution</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offline Mode Banner */}
      {!syncStatus.isOnline && (
        <div className="absolute top-16 right-0 w-80 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                You're offline
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                Changes will sync when connection is restored
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Progress */}
      {syncStatus.syncInProgress && (
        <div className="absolute top-16 right-0 w-80 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Syncing data...
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                {syncStatus.pendingActions} actions remaining
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Notification */}
      {syncStatus.conflictCount > 0 && (
        <div className="absolute top-16 right-0 w-80 bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                {syncStatus.conflictCount} conflicts detected
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-300">
                Manual resolution may be required
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;