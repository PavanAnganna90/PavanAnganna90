/**
 * Offline Service
 * 
 * Comprehensive offline functionality for mobile app:
 * - Data synchronization and conflict resolution
 * - Offline-first data caching
 * - Background sync capabilities
 * - Offline UI state management
 * - Network status monitoring
 * - Queue management for offline actions
 * - Data persistence strategies
 * - Conflict resolution algorithms
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { format, parseISO } from 'date-fns';

export interface OfflineData {
  id: string;
  type: string;
  data: any;
  lastModified: Date;
  version: number;
  synced: boolean;
  syncAttempts: number;
  conflicts?: ConflictData[];
}

export interface ConflictData {
  id: string;
  field: string;
  localValue: any;
  serverValue: any;
  timestamp: Date;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: Date;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingActions: number;
  conflictCount: number;
  syncInProgress: boolean;
  syncError?: string;
}

export interface OfflineConfig {
  maxRetries: number;
  retryDelay: number;
  syncInterval: number;
  maxCacheSize: number;
  conflictResolution: 'manual' | 'automatic';
  backgroundSync: boolean;
  offlineFirst: boolean;
}

interface OfflineDB extends DBSchema {
  data: {
    key: string;
    value: OfflineData;
    indexes: {
      'by-type': string;
      'by-synced': boolean;
      'by-modified': Date;
    };
  };
  actions: {
    key: string;
    value: OfflineAction;
    indexes: {
      'by-status': string;
      'by-resource': string;
      'by-timestamp': Date;
    };
  };
  conflicts: {
    key: string;
    value: ConflictData;
    indexes: {
      'by-resolved': boolean;
      'by-timestamp': Date;
    };
  };
  metadata: {
    key: string;
    value: any;
  };
}

export class OfflineService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private config: OfflineConfig;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkListeners: ((online: boolean) => void)[] = [];
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      syncInterval: 30000,
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      conflictResolution: 'manual',
      backgroundSync: true,
      offlineFirst: true,
      ...config
    };
  }

  // Initialize offline service
  async initialize(): Promise<void> {
    this.db = await openDB<OfflineDB>('opssight-offline', 1, {
      upgrade(db) {
        // Data store
        const dataStore = db.createObjectStore('data', { keyPath: 'id' });
        dataStore.createIndex('by-type', 'type');
        dataStore.createIndex('by-synced', 'synced');
        dataStore.createIndex('by-modified', 'lastModified');

        // Actions store
        const actionsStore = db.createObjectStore('actions', { keyPath: 'id' });
        actionsStore.createIndex('by-status', 'status');
        actionsStore.createIndex('by-resource', 'resource');
        actionsStore.createIndex('by-timestamp', 'timestamp');

        // Conflicts store
        const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
        conflictsStore.createIndex('by-resolved', 'resolved');
        conflictsStore.createIndex('by-timestamp', 'timestamp');

        // Metadata store
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    });

    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Start background sync if enabled
    if (this.config.backgroundSync) {
      this.startBackgroundSync();
    }

    // Register service worker for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await this.registerBackgroundSync();
    }
  }

  // Network monitoring
  private setupNetworkMonitoring(): void {
    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      this.networkListeners.forEach(listener => listener(isOnline));
      
      if (isOnline) {
        this.syncPendingActions();
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  }

  // Background sync registration
  private async registerBackgroundSync(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      registration.addEventListener('sync', (event) => {
        if (event.tag === 'background-sync') {
          event.waitUntil(this.syncPendingActions());
        }
      });
    } catch (error) {
      console.warn('Background sync registration failed:', error);
    }
  }

  // Start background sync interval
  private startBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        await this.syncPendingActions();
      }
    }, this.config.syncInterval);
  }

  // Store data offline
  async storeData(type: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Offline service not initialized');

    const offlineData: OfflineData = {
      id: data.id || this.generateId(),
      type,
      data,
      lastModified: new Date(),
      version: 1,
      synced: false,
      syncAttempts: 0
    };

    await this.db.put('data', offlineData);
  }

  // Retrieve data offline
  async getData(type: string, id?: string): Promise<OfflineData | OfflineData[]> {
    if (!this.db) throw new Error('Offline service not initialized');

    if (id) {
      const data = await this.db.get('data', id);
      if (!data || data.type !== type) return null;
      return data;
    }

    return this.db.getAllFromIndex('data', 'by-type', type);
  }

  // Update data offline
  async updateData(id: string, updates: Partial<any>): Promise<void> {
    if (!this.db) throw new Error('Offline service not initialized');

    const existing = await this.db.get('data', id);
    if (!existing) throw new Error('Data not found');

    const updated: OfflineData = {
      ...existing,
      data: { ...existing.data, ...updates },
      lastModified: new Date(),
      version: existing.version + 1,
      synced: false,
      syncAttempts: 0
    };

    await this.db.put('data', updated);
  }

  // Delete data offline
  async deleteData(id: string): Promise<void> {
    if (!this.db) throw new Error('Offline service not initialized');

    await this.db.delete('data', id);
  }

  // Queue offline action
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<void> {
    if (!this.db) throw new Error('Offline service not initialized');

    const offlineAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: new Date(),
      retries: 0,
      status: 'pending'
    };

    await this.db.put('actions', offlineAction);

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.syncPendingActions();
    }
  }

  // Sync pending actions
  async syncPendingActions(): Promise<void> {
    if (!this.db) return;

    const pendingActions = await this.db.getAllFromIndex('actions', 'by-status', 'pending');
    const processingActions = await this.db.getAllFromIndex('actions', 'by-status', 'processing');
    
    const allActions = [...pendingActions, ...processingActions];
    
    for (const action of allActions) {
      await this.processAction(action);
    }

    // Update sync status
    this.notifySyncListeners();
  }

  // Process individual action
  private async processAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;

    try {
      // Mark as processing
      await this.db.put('actions', { ...action, status: 'processing' });

      // Perform the action
      const result = await this.performServerAction(action);

      if (result.success) {
        // Mark as completed
        await this.db.put('actions', { ...action, status: 'completed' });
        
        // Update local data if needed
        if (action.type === 'create' || action.type === 'update') {
          await this.updateLocalDataFromServer(action.resource, action.data.id, result.data);
        }
      } else {
        throw new Error(result.error || 'Server action failed');
      }
    } catch (error) {
      // Handle retry logic
      const updatedAction = {
        ...action,
        retries: action.retries + 1,
        status: action.retries + 1 >= action.maxRetries ? 'failed' : 'pending',
        error: error.message
      };

      await this.db.put('actions', updatedAction);

      // Schedule retry if not exceeded max retries
      if (updatedAction.retries < action.maxRetries) {
        setTimeout(() => this.processAction(updatedAction), this.config.retryDelay);
      }
    }
  }

  // Perform server action
  private async performServerAction(action: OfflineAction): Promise<{ success: boolean; data?: any; error?: string }> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${baseUrl}/api/v1/${action.resource}`;

    try {
      let response: Response;

      switch (action.type) {
        case 'create':
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data)
          });
          break;

        case 'update':
          response = await fetch(`${url}/${action.data.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data)
          });
          break;

        case 'delete':
          response = await fetch(`${url}/${action.data.id}`, {
            method: 'DELETE'
          });
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = action.type !== 'delete' ? await response.json() : null;
      return { success: true, data };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update local data from server
  private async updateLocalDataFromServer(resource: string, id: string, serverData: any): Promise<void> {
    if (!this.db) return;

    const existingData = await this.db.get('data', id);
    
    if (existingData) {
      const updatedData: OfflineData = {
        ...existingData,
        data: serverData,
        lastModified: new Date(),
        version: existingData.version + 1,
        synced: true,
        syncAttempts: 0
      };

      await this.db.put('data', updatedData);
    }
  }

  // Handle conflicts
  async handleConflicts(conflicts: ConflictData[]): Promise<void> {
    if (!this.db) return;

    for (const conflict of conflicts) {
      await this.db.put('conflicts', conflict);
    }

    if (this.config.conflictResolution === 'automatic') {
      await this.resolveConflictsAutomatically();
    }
  }

  // Resolve conflicts automatically
  private async resolveConflictsAutomatically(): Promise<void> {
    if (!this.db) return;

    const unresolvedConflicts = await this.db.getAllFromIndex('conflicts', 'by-resolved', false);

    for (const conflict of unresolvedConflicts) {
      // Simple last-write-wins strategy
      const resolution = conflict.timestamp > new Date() ? 'server' : 'local';
      
      await this.resolveConflict(conflict.id, resolution);
    }
  }

  // Resolve specific conflict
  async resolveConflict(conflictId: string, resolution: 'local' | 'server' | 'merge'): Promise<void> {
    if (!this.db) return;

    const conflict = await this.db.get('conflicts', conflictId);
    if (!conflict) return;

    const resolvedConflict: ConflictData = {
      ...conflict,
      resolved: true,
      resolution
    };

    await this.db.put('conflicts', resolvedConflict);
  }

  // Get sync status
  async getSyncStatus(): Promise<SyncStatus> {
    if (!this.db) {
      return {
        isOnline: navigator.onLine,
        lastSyncTime: null,
        pendingActions: 0,
        conflictCount: 0,
        syncInProgress: false
      };
    }

    const pendingActions = await this.db.getAllFromIndex('actions', 'by-status', 'pending');
    const processingActions = await this.db.getAllFromIndex('actions', 'by-status', 'processing');
    const unresolvedConflicts = await this.db.getAllFromIndex('conflicts', 'by-resolved', false);
    
    const lastSyncTime = await this.getLastSyncTime();

    return {
      isOnline: navigator.onLine,
      lastSyncTime,
      pendingActions: pendingActions.length,
      conflictCount: unresolvedConflicts.length,
      syncInProgress: processingActions.length > 0
    };
  }

  // Get last sync time
  private async getLastSyncTime(): Promise<Date | null> {
    if (!this.db) return null;

    const metadata = await this.db.get('metadata', 'lastSyncTime');
    return metadata ? parseISO(metadata.value) : null;
  }

  // Set last sync time
  private async setLastSyncTime(time: Date): Promise<void> {
    if (!this.db) return;

    await this.db.put('metadata', {
      key: 'lastSyncTime',
      value: time.toISOString()
    });
  }

  // Clear offline data
  async clearOfflineData(): Promise<void> {
    if (!this.db) return;

    await this.db.clear('data');
    await this.db.clear('actions');
    await this.db.clear('conflicts');
    await this.db.clear('metadata');
  }

  // Get cache size
  async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    const data = await this.db.getAll('data');
    return data.reduce((size, item) => size + JSON.stringify(item).length, 0);
  }

  // Clean old data
  async cleanOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) return;

    const cutoffDate = new Date(Date.now() - maxAge);
    const oldData = await this.db.getAllFromIndex('data', 'by-modified', IDBKeyRange.upperBound(cutoffDate));

    for (const item of oldData) {
      if (item.synced) {
        await this.db.delete('data', item.id);
      }
    }
  }

  // Event listeners
  onNetworkChange(listener: (online: boolean) => void): () => void {
    this.networkListeners.push(listener);
    return () => {
      const index = this.networkListeners.indexOf(listener);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  // Notify sync listeners
  private async notifySyncListeners(): Promise<void> {
    const status = await this.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.networkListeners = [];
    this.syncListeners = [];
  }
}

export const offlineService = new OfflineService();