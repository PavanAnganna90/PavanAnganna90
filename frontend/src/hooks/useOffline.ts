/**
 * Offline Hook
 * 
 * Custom hook for managing offline functionality:
 * - Network status monitoring
 * - Data caching and synchronization
 * - Offline action queuing
 * - Conflict resolution
 * - Background sync management
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineService, SyncStatus, OfflineData, ConflictData } from '@/services/offlineService';

export interface UseOfflineResult {
  isOnline: boolean;
  syncStatus: SyncStatus;
  isInitialized: boolean;
  error: string | null;
  
  // Data operations
  storeData: (type: string, data: any) => Promise<void>;
  getData: (type: string, id?: string) => Promise<OfflineData | OfflineData[] | null>;
  updateData: (id: string, updates: Partial<any>) => Promise<void>;
  deleteData: (id: string) => Promise<void>;
  
  // Action operations
  queueAction: (action: any) => Promise<void>;
  syncPendingActions: () => Promise<void>;
  
  // Conflict operations
  getConflicts: () => Promise<ConflictData[]>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge') => Promise<void>;
  
  // Utility operations
  clearOfflineData: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  cleanOldData: (maxAge?: number) => Promise<void>;
}

export const useOffline = (): UseOfflineResult => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingActions: 0,
    conflictCount: 0,
    syncInProgress: false
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize offline service
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await offlineService.initialize();
        
        if (mounted) {
          setIsInitialized(true);
          const status = await offlineService.getSyncStatus();
          setSyncStatus(status);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize offline service');
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribeNetwork = offlineService.onNetworkChange((online) => {
      setIsOnline(online);
    });

    const unsubscribeSync = offlineService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  }, [isInitialized]);

  // Data operations
  const storeData = useCallback(async (type: string, data: any) => {
    try {
      await offlineService.storeData(type, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to store data');
      throw err;
    }
  }, []);

  const getData = useCallback(async (type: string, id?: string) => {
    try {
      return await offlineService.getData(type, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get data');
      throw err;
    }
  }, []);

  const updateData = useCallback(async (id: string, updates: Partial<any>) => {
    try {
      await offlineService.updateData(id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update data');
      throw err;
    }
  }, []);

  const deleteData = useCallback(async (id: string) => {
    try {
      await offlineService.deleteData(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data');
      throw err;
    }
  }, []);

  // Action operations
  const queueAction = useCallback(async (action: any) => {
    try {
      await offlineService.queueAction(action);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue action');
      throw err;
    }
  }, []);

  const syncPendingActions = useCallback(async () => {
    try {
      await offlineService.syncPendingActions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync pending actions');
      throw err;
    }
  }, []);

  // Conflict operations
  const getConflicts = useCallback(async (): Promise<ConflictData[]> => {
    try {
      // This would need to be implemented in the offline service
      return [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get conflicts');
      throw err;
    }
  }, []);

  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
    try {
      await offlineService.resolveConflict(conflictId, resolution);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
      throw err;
    }
  }, []);

  // Utility operations
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineService.clearOfflineData();
      const status = await offlineService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear offline data');
      throw err;
    }
  }, []);

  const getCacheSize = useCallback(async () => {
    try {
      return await offlineService.getCacheSize();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get cache size');
      throw err;
    }
  }, []);

  const cleanOldData = useCallback(async (maxAge?: number) => {
    try {
      await offlineService.cleanOldData(maxAge);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clean old data');
      throw err;
    }
  }, []);

  return {
    isOnline,
    syncStatus,
    isInitialized,
    error,
    storeData,
    getData,
    updateData,
    deleteData,
    queueAction,
    syncPendingActions,
    getConflicts,
    resolveConflict,
    clearOfflineData,
    getCacheSize,
    cleanOldData
  };
};

export default useOffline;