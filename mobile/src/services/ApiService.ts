/**
 * API Service for OpsSight Mobile App
 * 
 * Handles all HTTP requests with authentication, caching, and offline support
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { store } from '../store/store';
import { 
  addPendingAction, 
  setCachedData, 
  setOnlineStatus,
  clearExpiredCache 
} from '../store/slices/offlineSlice';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api/v1'
  : 'https://api.opssight.com/api/v1';

// Backend endpoints
const ENDPOINTS = {
  // Authentication
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  OAUTH_GITHUB: '/auth/github',
  
  // Metrics
  METRICS_HEALTH: '/metrics/health',
  METRICS_LIVE: '/metrics/api/metrics/live',
  METRICS_SYSTEM: '/metrics/api/metrics/system',
  METRICS_EVENTS: '/metrics/api/events',
  METRICS_INSIGHTS: '/metrics/api/insights',
  
  // Alerts
  ALERTS: '/alerts',
  ALERTS_SUMMARY: '/alerts/summary',
  
  // Teams
  TEAMS: '/teams',
  TEAM_MEMBERS: '/teams/{teamId}/members',
  
  // User
  USER_PROFILE: '/users/me',
  USER_PREFERENCES: '/users/me/preferences',
  
  // Notifications
  PUSH_TOKENS: '/push-tokens',
  NOTIFICATIONS: '/notifications',
} as const;

const API_TIMEOUT = 30000; // 30 seconds
const CACHE_TTL = 300; // 5 minutes default TTL

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@opssight/access_token',
  REFRESH_TOKEN: '@opssight/refresh_token',
  API_CACHE: '@opssight/api_cache',
} as const;

// Request queue for offline operations
interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class ApiService {
  private client: AxiosInstance;
  private requestQueue: QueuedRequest[] = [];
  private isOnline = true;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupNetworkMonitoring();
    this.clearExpiredCache();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add authentication token
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request metadata
        config.metadata = {
          startTime: Date.now(),
          retryCount: config.metadata?.retryCount || 0,
        };

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata?.startTime;
        console.log(`API Request completed in ${duration}ms: ${response.config.url}`);
        
        // Cache successful GET requests
        if (response.config.method === 'get' && response.status === 200) {
          this.cacheResponse(response.config.url!, response.data);
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            const newToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthenticationError();
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors
        if (!error.response) {
          return this.handleNetworkError(originalRequest, error);
        }

        return Promise.reject(error);
      }
    );
  }

  private setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Update store
      store.dispatch(setOnlineStatus(this.isOnline));

      // Process queued requests when coming back online
      if (!wasOnline && this.isOnline) {
        this.processRequestQueue();
      }
    });
  }

  private async handleNetworkError(config: AxiosRequestConfig, error: any) {
    // For GET requests, try to return cached data
    if (config.method === 'get') {
      const cachedData = await this.getCachedData(config.url!);
      if (cachedData) {
        console.log(`Returning cached data for ${config.url}`);
        return { data: cachedData, fromCache: true };
      }
    }

    // For POST/PUT/DELETE requests, queue them for later
    if (['post', 'put', 'delete'].includes(config.method?.toLowerCase() || '')) {
      return this.queueRequest(config);
    }

    throw error;
  }

  private queueRequest(config: AxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: Date.now().toString(),
        config,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.requestQueue.push(queuedRequest);

      // Also add to Redux store for persistence
      store.dispatch(addPendingAction({
        type: config.method?.toUpperCase() as 'POST' | 'PUT' | 'DELETE',
        url: config.url || '',
        data: config.data,
        maxRetries: 3,
      }));

      console.log(`Queued request: ${config.method?.toUpperCase()} ${config.url}`);
    });
  }

  private async processRequestQueue() {
    console.log(`Processing ${this.requestQueue.length} queued requests`);

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const queuedRequest of queue) {
      try {
        const response = await this.client(queuedRequest.config);
        queuedRequest.resolve(response);
      } catch (error) {
        queuedRequest.reject(error);
      }
    }
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token: newRefreshToken } = response.data;

    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    if (newRefreshToken) {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
    }
  }

  private handleAuthenticationError() {
    // Clear stored tokens
    AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);

    // Navigate to login (this would be handled by auth context in real app)
    console.log('Authentication failed, redirecting to login');
  }

  private async cacheResponse(url: string, data: any, ttl: number = CACHE_TTL) {
    const cacheKey = this.getCacheKey(url);
    const cacheData = {
      key: cacheKey,
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Store in Redux
    store.dispatch(setCachedData(cacheData));

    // Also store in AsyncStorage for persistence
    try {
      const existingCache = await AsyncStorage.getItem(STORAGE_KEYS.API_CACHE);
      const cache = existingCache ? JSON.parse(existingCache) : {};
      cache[cacheKey] = cacheData;
      await AsyncStorage.setItem(STORAGE_KEYS.API_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }

  private async getCachedData(url: string): Promise<any | null> {
    const cacheKey = this.getCacheKey(url);

    // First check Redux store
    const state = store.getState();
    const cachedItem = state.offline.cachedData.find(item => item.key === cacheKey);
    
    if (cachedItem && !this.isCacheExpired(cachedItem)) {
      return cachedItem.data;
    }

    // Fallback to AsyncStorage
    try {
      const cache = await AsyncStorage.getItem(STORAGE_KEYS.API_CACHE);
      if (cache) {
        const parsedCache = JSON.parse(cache);
        const cachedData = parsedCache[cacheKey];
        
        if (cachedData && !this.isCacheExpired(cachedData)) {
          return cachedData.data;
        }
      }
    } catch (error) {
      console.error('Failed to get cached data:', error);
    }

    return null;
  }

  private getCacheKey(url: string): string {
    return `api_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private isCacheExpired(cacheItem: any): boolean {
    const now = Date.now();
    return now - cacheItem.timestamp > cacheItem.ttl * 1000;
  }

  private clearExpiredCache() {
    // Clear expired cache on app start
    store.dispatch(clearExpiredCache());
    
    // Set up periodic cache cleanup
    setInterval(() => {
      store.dispatch(clearExpiredCache());
    }, 60000); // Clean every minute
  }

  // Public API methods

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  // Authentication helpers
  async setAuthToken(token: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  async setRefreshToken(token: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  async clearAuth() {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);
  }

  // Utility methods
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }

  async clearCache() {
    await AsyncStorage.removeItem(STORAGE_KEYS.API_CACHE);
  }

  // ============================================================================
  // Backend API Methods
  // ============================================================================

  // Authentication
  async login(credentials: { email: string; password: string }) {
    return this.post(ENDPOINTS.LOGIN, credentials);
  }

  async logout() {
    return this.post(ENDPOINTS.LOGOUT);
  }

  async githubOAuth(code: string) {
    return this.post(ENDPOINTS.OAUTH_GITHUB, { code });
  }

  // Metrics
  async getSystemHealth() {
    return this.get(ENDPOINTS.METRICS_HEALTH);
  }

  async getLiveMetrics() {
    return this.get(ENDPOINTS.METRICS_LIVE);
  }

  async getSystemMetrics() {
    return this.get(ENDPOINTS.METRICS_SYSTEM);
  }

  async getEvents() {
    return this.get(ENDPOINTS.METRICS_EVENTS);
  }

  async getInsights() {
    return this.get(ENDPOINTS.METRICS_INSIGHTS);
  }

  // Alerts
  async getAlerts(params?: { status?: string; severity?: string; page?: number; limit?: number }) {
    return this.get(ENDPOINTS.ALERTS, { params });
  }

  async getAlertsSummary() {
    return this.get(ENDPOINTS.ALERTS_SUMMARY);
  }

  async acknowledgeAlert(alertId: string) {
    return this.post(`${ENDPOINTS.ALERTS}/${alertId}/acknowledge`);
  }

  async resolveAlert(alertId: string) {
    return this.post(`${ENDPOINTS.ALERTS}/${alertId}/resolve`);
  }

  // Teams
  async getTeams() {
    return this.get(ENDPOINTS.TEAMS);
  }

  async getTeamMembers(teamId: string) {
    return this.get(ENDPOINTS.TEAM_MEMBERS.replace('{teamId}', teamId));
  }

  async joinTeam(teamId: string) {
    return this.post(`${ENDPOINTS.TEAMS}/${teamId}/join`);
  }

  async leaveTeam(teamId: string) {
    return this.post(`${ENDPOINTS.TEAMS}/${teamId}/leave`);
  }

  // User
  async getUserProfile() {
    return this.get(ENDPOINTS.USER_PROFILE);
  }

  async updateUserProfile(data: any) {
    return this.put(ENDPOINTS.USER_PROFILE, data);
  }

  async getUserPreferences() {
    return this.get(ENDPOINTS.USER_PREFERENCES);
  }

  async updateUserPreferences(preferences: any) {
    return this.put(ENDPOINTS.USER_PREFERENCES, preferences);
  }

  // Push Notifications
  async registerPushToken(token: string, platform: 'ios' | 'android') {
    return this.post(ENDPOINTS.PUSH_TOKENS, { token, platform });
  }

  async unregisterPushToken(token: string) {
    return this.delete(`${ENDPOINTS.PUSH_TOKENS}/${token}`);
  }

  async getNotifications(params?: { unread?: boolean; page?: number; limit?: number }) {
    return this.get(ENDPOINTS.NOTIFICATIONS, { params });
  }

  async markNotificationAsRead(notificationId: string) {
    return this.post(`${ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.post(`${ENDPOINTS.NOTIFICATIONS}/mark-all-read`);
  }

  // Dashboard Data
  async getDashboardData() {
    const [health, metrics, alerts, events] = await Promise.all([
      this.getSystemHealth(),
      this.getLiveMetrics(),
      this.getAlertsSummary(),
      this.getEvents(),
    ]);

    return {
      health,
      metrics,
      alerts,
      events,
    };
  }

  // Batch operations for better performance
  async batchRequest(requests: Array<{ method: string; url: string; data?: any }>) {
    const promises = requests.map(req => {
      switch (req.method.toUpperCase()) {
        case 'GET':
          return this.get(req.url);
        case 'POST':
          return this.post(req.url, req.data);
        case 'PUT':
          return this.put(req.url, req.data);
        case 'DELETE':
          return this.delete(req.url);
        default:
          throw new Error(`Unsupported method: ${req.method}`);
      }
    });

    return Promise.allSettled(promises);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;