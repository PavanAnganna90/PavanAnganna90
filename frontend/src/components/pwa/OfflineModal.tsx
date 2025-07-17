/**
 * Offline Modal Component
 * 
 * Modal for managing offline functionality:
 * - Conflict resolution interface
 * - Manual sync controls
 * - Offline data management
 * - Cache statistics
 * - Sync history
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useOffline } from '@/hooks/useOffline';
import { ConflictData } from '@/services/offlineService';

interface OfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sync' | 'conflicts' | 'cache' | 'settings';
}

export const OfflineModal: React.FC<OfflineModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'sync'
}) => {
  const {
    isOnline,
    syncStatus,
    isInitialized,
    error,
    syncPendingActions,
    getConflicts,
    resolveConflict,
    clearOfflineData,
    getCacheSize,
    cleanOldData
  } = useOffline();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Load modal data
  useEffect(() => {
    if (isOpen && isInitialized) {
      loadModalData();
    }
  }, [isOpen, isInitialized]);

  const loadModalData = async () => {
    setLoading(true);
    setLocalError(null);

    try {
      const [conflictsData, cacheSizeData] = await Promise.all([
        getConflicts(),
        getCacheSize()
      ]);

      setConflicts(conflictsData);
      setCacheSize(cacheSizeData);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to load modal data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) return;

    setLoading(true);
    try {
      await syncPendingActions();
      await loadModalData();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    try {
      await resolveConflict(conflictId, resolution);
      await loadModalData();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await clearOfflineData();
      await loadModalData();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanOldData = async () => {
    setLoading(true);
    try {
      await cleanOldData();
      await loadModalData();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to clean old data');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Offline Management
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error Display */}
          {(error || localError) && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200">
                {error || localError}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'sync', label: 'Sync Status', count: syncStatus.pendingActions },
                { id: 'conflicts', label: 'Conflicts', count: conflicts.length },
                { id: 'cache', label: 'Cache Management' },
                { id: 'settings', label: 'Settings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Sync Status Tab */}
            {activeTab === 'sync' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Connection Status</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isOnline ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Last Sync</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {syncStatus.lastSyncTime 
                        ? format(syncStatus.lastSyncTime, 'MMM dd, yyyy HH:mm') 
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Pending Actions ({syncStatus.pendingActions})
                    </h3>
                    <button
                      onClick={handleManualSync}
                      disabled={!isOnline || syncStatus.syncInProgress || loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                    >
                      {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>

                  {syncStatus.pendingActions > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {syncStatus.pendingActions} actions queued for sync
                        </span>
                      </div>
                      {syncStatus.syncInProgress && (
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All actions have been synchronized
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Conflicts Tab */}
            {activeTab === 'conflicts' && (
              <div className="space-y-4">
                {conflicts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No conflicts detected</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conflicts.map((conflict) => (
                      <div key={conflict.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            Field: {conflict.field}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {format(conflict.timestamp, 'MMM dd, HH:mm')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local Value</h4>
                            <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded text-sm">
                              {JSON.stringify(conflict.localValue, null, 2)}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Server Value</h4>
                            <div className="bg-green-50 dark:bg-green-900 p-2 rounded text-sm">
                              {JSON.stringify(conflict.serverValue, null, 2)}
                            </div>
                          </div>
                        </div>

                        {!conflict.resolved && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleResolveConflict(conflict.id, 'local')}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                            >
                              Use Local
                            </button>
                            <button
                              onClick={() => handleResolveConflict(conflict.id, 'server')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                            >
                              Use Server
                            </button>
                            <button
                              onClick={() => handleResolveConflict(conflict.id, 'merge')}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                            >
                              Merge
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cache Management Tab */}
            {activeTab === 'cache' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Cache Size</h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatFileSize(cacheSize)}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Cache Status</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isInitialized ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Cache Operations</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleCleanOldData}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-300 text-white rounded font-medium transition-colors"
                    >
                      Clean Old Data
                    </button>
                    <button
                      onClick={handleClearCache}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded font-medium transition-colors"
                    >
                      Clear All Cache
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Warning: Clearing cache will remove all offline data
                  </p>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Offline Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Background Sync
                      </label>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Auto Conflict Resolution
                      </label>
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Offline First Mode
                      </label>
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Storage Limits</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Cache Size</span>
                      <span className="font-medium">100 MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Data Age</span>
                      <span className="font-medium">7 days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Sync Interval</span>
                      <span className="font-medium">30 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Offline functionality powered by IndexedDB
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineModal;