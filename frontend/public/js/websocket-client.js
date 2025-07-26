/**
 * OpsSight WebSocket Client - v2.0.0
 * Real-time communication client for live dashboard updates
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnection
 * - Event-based architecture
 * - Multiple subscription management
 * - Heartbeat monitoring
 * - Error handling and logging
 */

class OpsSightWebSocketClient extends EventTarget {
    constructor(options = {}) {
        super();
        
        this.url = options.url || 'ws://localhost:8765';
        this.reconnectInterval = options.reconnectInterval || 1000;
        this.maxReconnectInterval = options.maxReconnectInterval || 30000;
        this.reconnectMultiplier = options.reconnectMultiplier || 1.5;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 50;
        this.heartbeatInterval = options.heartbeatInterval || 30000;
        
        // Connection state
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.sessionId = null;
        this.userId = null;
        
        // Message handling
        this.messageQueue = [];
        this.subscriptions = new Set();
        this.eventHandlers = new Map();
        
        // Authentication
        this.authToken = null;
        this.userMetadata = {};
        
        // Statistics
        this.stats = {
            messagesReceived: 0,
            messagesSent: 0,
            reconnections: 0,
            lastConnected: null,
            totalUptime: 0
        };
        
        this.debug = options.debug || false;
        this.log('OpsSight WebSocket Client initialized');
    }
    
    /**
     * Connect to WebSocket server
     */
    async connect(authToken, userId = 'demo_user', subscriptions = ['all'], metadata = {}) {
        this.authToken = authToken;
        this.userId = userId;
        this.userMetadata = metadata;
        
        if (subscriptions.length > 0) {
            subscriptions.forEach(sub => this.subscriptions.add(sub));
        }
        
        try {
            this.log('Connecting to WebSocket server...');
            
            this.websocket = new WebSocket(this.url);
            
            this.websocket.onopen = () => this.handleOpen();
            this.websocket.onmessage = (event) => this.handleMessage(event);
            this.websocket.onclose = (event) => this.handleClose(event);
            this.websocket.onerror = (event) => this.handleError(event);
            
        } catch (error) {
            this.log('Connection failed:', error);
            this.scheduleReconnect();
        }
    }
    
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        this.isConnected = false;
        this.clearReconnectTimer();
        this.clearHeartbeatTimer();
        
        if (this.websocket) {
            this.websocket.close(1000, 'Client disconnect');
            this.websocket = null;
        }
        
        this.log('Disconnected from WebSocket server');
        this.dispatchEvent(new CustomEvent('disconnected'));
    }
    
    /**
     * Handle WebSocket open event
     */
    async handleOpen() {
        this.log('WebSocket connection opened');
        
        // Send authentication message
        const authMessage = {
            type: 'authentication',
            token: this.authToken,
            user_id: this.userId,
            subscriptions: Array.from(this.subscriptions),
            metadata: {
                ...this.userMetadata,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };
        
        this.sendMessage(authMessage);
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.stats.messagesReceived++;
            
            this.log('Received message:', message);
            
            // Handle different message types
            switch (message.type) {
                case 'authentication':
                    this.handleAuthentication(message);
                    break;
                case 'heartbeat':
                    this.handleHeartbeat(message);
                    break;
                case 'error':
                    this.handleServerError(message);
                    break;
                default:
                    this.handleDataMessage(message);
                    break;
            }
            
            // Dispatch generic message event
            this.dispatchEvent(new CustomEvent('message', { detail: message }));
            
        } catch (error) {
            this.log('Error parsing message:', error);
        }
    }
    
    /**
     * Handle WebSocket close event
     */
    handleClose(event) {
        this.isConnected = false;
        this.clearHeartbeatTimer();
        
        this.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
        
        this.dispatchEvent(new CustomEvent('disconnected', { 
            detail: { code: event.code, reason: event.reason } 
        }));
        
        // Attempt reconnection unless it was a clean close
        if (event.code !== 1000) {
            this.scheduleReconnect();
        }
    }
    
    /**
     * Handle WebSocket error event
     */
    handleError(event) {
        this.log('WebSocket error:', event);
        this.dispatchEvent(new CustomEvent('error', { detail: event }));
    }
    
    /**
     * Handle authentication response
     */
    handleAuthentication(message) {
        if (message.data.status === 'authenticated') {
            this.isConnected = true;
            this.sessionId = message.data.session_id;
            this.reconnectAttempts = 0;
            this.stats.lastConnected = new Date();
            this.stats.reconnections++;
            
            this.log(`Authenticated successfully. Session ID: ${this.sessionId}`);
            
            // Start heartbeat
            this.startHeartbeat();
            
            // Send queued messages
            this.processMessageQueue();
            
            this.dispatchEvent(new CustomEvent('connected', { 
                detail: { sessionId: this.sessionId, subscriptions: message.data.subscriptions } 
            }));
        } else {
            this.log('Authentication failed');
            this.dispatchEvent(new CustomEvent('authenticationFailed', { detail: message.data }));
        }
    }
    
    /**
     * Handle heartbeat message
     */
    handleHeartbeat(message) {
        this.log('Heartbeat received');
        // Server confirms it's alive, no action needed
    }
    
    /**
     * Handle server error message
     */
    handleServerError(message) {
        this.log('Server error:', message.data.error);
        this.dispatchEvent(new CustomEvent('serverError', { detail: message.data }));
    }
    
    /**
     * Handle data messages (metrics, alerts, etc.)
     */
    handleDataMessage(message) {
        // Dispatch specific event for message type
        this.dispatchEvent(new CustomEvent(message.type, { detail: message }));
        
        // Dispatch channel-specific event
        if (message.channel) {
            this.dispatchEvent(new CustomEvent(`channel:${message.channel}`, { detail: message }));
        }
    }
    
    /**
     * Send message to server
     */
    sendMessage(message) {
        if (this.isConnected && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            try {
                const messageStr = JSON.stringify(message);
                this.websocket.send(messageStr);
                this.stats.messagesSent++;
                this.log('Sent message:', message);
            } catch (error) {
                this.log('Error sending message:', error);
            }
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            this.log('Message queued (not connected):', message);
        }
    }
    
    /**
     * Process queued messages
     */
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }
    }
    
    /**
     * Subscribe to channels
     */
    subscribe(channels) {
        const channelsArray = Array.isArray(channels) ? channels : [channels];
        
        channelsArray.forEach(channel => this.subscriptions.add(channel));
        
        this.sendMessage({
            type: 'subscription',
            action: 'subscribe',
            channels: channelsArray
        });
        
        this.log('Subscribed to channels:', channelsArray);
    }
    
    /**
     * Unsubscribe from channels
     */
    unsubscribe(channels) {
        const channelsArray = Array.isArray(channels) ? channels : [channels];
        
        channelsArray.forEach(channel => this.subscriptions.delete(channel));
        
        this.sendMessage({
            type: 'subscription',
            action: 'unsubscribe',
            channels: channelsArray
        });
        
        this.log('Unsubscribed from channels:', channelsArray);
    }
    
    /**
     * Send chat message
     */
    sendChatMessage(channel, content) {
        this.sendMessage({
            type: 'chat_message',
            channel: channel,
            content: content
        });
    }
    
    /**
     * Send user activity update
     */
    sendUserActivity(activityType, data = {}) {
        this.sendMessage({
            type: 'user_activity',
            activity_type: activityType,
            data: data
        });
    }
    
    /**
     * Start heartbeat timer
     */
    startHeartbeat() {
        this.clearHeartbeatTimer();
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.sendMessage({ type: 'heartbeat' });
            }
        }, this.heartbeatInterval);
    }
    
    /**
     * Clear heartbeat timer
     */
    clearHeartbeatTimer() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        this.clearReconnectTimer();
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.log('Max reconnection attempts reached');
            this.dispatchEvent(new CustomEvent('maxReconnectAttemptsReached'));
            return;
        }
        
        const delay = Math.min(
            this.reconnectInterval * Math.pow(this.reconnectMultiplier, this.reconnectAttempts),
            this.maxReconnectInterval
        );
        
        this.reconnectAttempts++;
        
        this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(() => {
            this.log(`Reconnection attempt ${this.reconnectAttempts}`);
            this.connect(this.authToken, this.userId, Array.from(this.subscriptions), this.userMetadata);
        }, delay);
        
        this.dispatchEvent(new CustomEvent('reconnecting', { 
            detail: { attempt: this.reconnectAttempts, delay } 
        }));
    }
    
    /**
     * Clear reconnection timer
     */
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    
    /**
     * Get connection statistics
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            sessionId: this.sessionId,
            subscriptions: Array.from(this.subscriptions),
            reconnectAttempts: this.reconnectAttempts,
            queuedMessages: this.messageQueue.length
        };
    }
    
    /**
     * Add event listener with convenience method
     */
    on(eventType, handler) {
        this.addEventListener(eventType, handler);
        
        // Store handler for easy removal
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType).add(handler);
    }
    
    /**
     * Remove event listener
     */
    off(eventType, handler) {
        this.removeEventListener(eventType, handler);
        
        if (this.eventHandlers.has(eventType)) {
            this.eventHandlers.get(eventType).delete(handler);
        }
    }
    
    /**
     * Remove all event listeners for a type
     */
    offAll(eventType) {
        if (this.eventHandlers.has(eventType)) {
            for (const handler of this.eventHandlers.get(eventType)) {
                this.removeEventListener(eventType, handler);
            }
            this.eventHandlers.delete(eventType);
        }
    }
    
    /**
     * Log messages with timestamp
     */
    log(...args) {
        if (this.debug) {
            console.log(`[OpsSight WS ${new Date().toISOString()}]`, ...args);
        }
    }
}

/**
 * Global WebSocket client instance
 */
window.OpsSightWebSocket = {
    client: null,
    
    /**
     * Initialize and connect WebSocket client
     */
    async connect(options = {}) {
        if (this.client) {
            this.client.disconnect();
        }
        
        this.client = new OpsSightWebSocketClient({
            debug: true,
            ...options
        });
        
        // Get auth token from localStorage
        const authToken = localStorage.getItem('auth_token') || 'demo-token-' + Date.now();
        const userId = localStorage.getItem('user_id') || 'demo_user';
        
        try {
            await this.client.connect(authToken, userId, ['all'], {
                username: 'Demo User',
                role: 'admin',
                dashboard: window.location.pathname
            });
            
            console.log('✅ WebSocket client connected successfully');
            return this.client;
            
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            throw error;
        }
    },
    
    /**
     * Get current client instance
     */
    getClient() {
        return this.client;
    },
    
    /**
     * Check if connected
     */
    isConnected() {
        return this.client && this.client.isConnected;
    },
    
    /**
     * Disconnect WebSocket client
     */
    disconnect() {
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
    }
};

/**
 * Dashboard-specific WebSocket integration
 */
class DashboardWebSocketIntegration {
    constructor() {
        this.wsClient = null;
        this.updateHandlers = new Map();
        this.initialized = false;
    }
    
    /**
     * Initialize WebSocket integration for dashboard
     */
    async initialize(dashboardType = 'general') {
        if (this.initialized) {
            return;
        }
        
        try {
            this.wsClient = await window.OpsSightWebSocket.connect({
                debug: true
            });
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Subscribe to relevant channels based on dashboard type
            this.subscribeToChannels(dashboardType);
            
            this.initialized = true;
            console.log(`✅ Dashboard WebSocket integration initialized for: ${dashboardType}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize WebSocket integration:', error);
            throw error;
        }
    }
    
    /**
     * Set up WebSocket event handlers
     */
    setupEventHandlers() {
        // Connection events
        this.wsClient.on('connected', (event) => {
            console.log('🔗 WebSocket connected:', event.detail);
            this.onConnectionStatusChange(true);
        });
        
        this.wsClient.on('disconnected', (event) => {
            console.log('🔌 WebSocket disconnected:', event.detail);
            this.onConnectionStatusChange(false);
        });
        
        // Data events
        this.wsClient.on('metrics_update', (event) => {
            this.handleMetricsUpdate(event.detail.data);
        });
        
        this.wsClient.on('alert_critical', (event) => {
            this.handleAlert(event.detail.data, 'critical');
        });
        
        this.wsClient.on('alert_warning', (event) => {
            this.handleAlert(event.detail.data, 'warning');
        });
        
        this.wsClient.on('performance_data', (event) => {
            this.handlePerformanceUpdate(event.detail.data);
        });
        
        this.wsClient.on('chat_message', (event) => {
            this.handleChatMessage(event.detail.data);
        });
        
        this.wsClient.on('user_activity', (event) => {
            this.handleUserActivity(event.detail.data);
        });
    }
    
    /**
     * Subscribe to channels based on dashboard type
     */
    subscribeToChannels(dashboardType) {
        let channels = ['metrics', 'alerts'];
        
        switch (dashboardType) {
            case 'security':
                channels.push('security');
                break;
            case 'performance':
                channels.push('performance');
                break;
            case 'collaboration':
                channels.push('collaboration');
                break;
            case 'cost':
                channels.push('cost_optimization');
                break;
            case 'deployment':
                channels.push('deployments');
                break;
            default:
                channels.push('all');
        }
        
        this.wsClient.subscribe(channels);
    }
    
    /**
     * Handle connection status changes
     */
    onConnectionStatusChange(isConnected) {
        // Update UI connection indicator
        const indicator = document.querySelector('.connection-status');
        if (indicator) {
            indicator.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
            indicator.textContent = isConnected ? '🟢 Live' : '🔴 Offline';
        }
        
        // Show/hide offline banner
        const offlineBanner = document.querySelector('.offline-banner');
        if (offlineBanner) {
            offlineBanner.style.display = isConnected ? 'none' : 'block';
        }
    }
    
    /**
     * Handle metrics updates
     */
    handleMetricsUpdate(data) {
        // Update CPU usage
        const cpuElement = document.getElementById('cpuUsage');
        if (cpuElement && data.cpu_usage !== undefined) {
            cpuElement.textContent = `${data.cpu_usage}%`;
        }
        
        // Update memory usage
        const memoryElement = document.getElementById('memoryUsage');
        if (memoryElement && data.memory_usage !== undefined) {
            memoryElement.textContent = `${data.memory_usage}%`;
        }
        
        // Update response time
        const responseTimeElement = document.getElementById('responseTime');
        if (responseTimeElement && data.response_time !== undefined) {
            responseTimeElement.textContent = `${data.response_time}ms`;
        }
        
        // Update charts if available
        if (window.metricsChart && data) {
            this.updateChart(window.metricsChart, data);
        }
    }
    
    /**
     * Handle alert notifications
     */
    handleAlert(data, severity) {
        // Show toast notification
        this.showAlertToast(data, severity);
        
        // Update alerts counter
        const alertsCounter = document.getElementById('alertsCount');
        if (alertsCounter) {
            const currentCount = parseInt(alertsCounter.textContent) || 0;
            alertsCounter.textContent = currentCount + 1;
        }
        
        // Add to alerts list if visible
        const alertsList = document.getElementById('alertsList');
        if (alertsList) {
            this.addAlertToList(alertsList, data, severity);
        }
    }
    
    /**
     * Handle performance data updates
     */
    handlePerformanceUpdate(data) {
        // Update health score
        const healthScore = document.getElementById('healthScore');
        if (healthScore && data.health_score !== undefined) {
            healthScore.textContent = data.health_score;
        }
        
        // Update performance metrics
        if (data.response_times) {
            const p95Element = document.getElementById('p95ResponseTime');
            if (p95Element) {
                p95Element.textContent = `${data.response_times.p95}ms`;
            }
        }
    }
    
    /**
     * Handle chat messages
     */
    handleChatMessage(data) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            this.addChatMessage(messagesContainer, data);
        }
    }
    
    /**
     * Handle user activity
     */
    handleUserActivity(data) {
        console.log('User activity:', data);
        // Update online users, typing indicators, etc.
    }
    
    /**
     * Show alert toast notification
     */
    showAlertToast(alert, severity) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert-toast alert-${severity}`;
        toast.innerHTML = `
            <div class="toast-icon">${severity === 'critical' ? '🚨' : '⚠️'}</div>
            <div class="toast-content">
                <div class="toast-title">${alert.title}</div>
                <div class="toast-message">${alert.message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to toast container
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 10000);
    }
    
    /**
     * Update chart with new data
     */
    updateChart(chart, data) {
        if (!chart.data || !chart.data.datasets) return;
        
        // Add new data point and remove old ones
        const maxDataPoints = 20;
        
        chart.data.labels.push(new Date().toLocaleTimeString());
        if (chart.data.labels.length > maxDataPoints) {
            chart.data.labels.shift();
        }
        
        chart.data.datasets.forEach((dataset, index) => {
            let value;
            switch (index) {
                case 0: value = data.cpu_usage; break;
                case 1: value = data.memory_usage; break;
                case 2: value = data.response_time; break;
                default: value = 0;
            }
            
            dataset.data.push(value);
            if (dataset.data.length > maxDataPoints) {
                dataset.data.shift();
            }
        });
        
        chart.update('none'); // Update without animation for smooth real-time
    }
    
    /**
     * Get WebSocket client instance
     */
    getClient() {
        return this.wsClient;
    }
    
    /**
     * Send chat message
     */
    sendChatMessage(channel, content) {
        if (this.wsClient) {
            this.wsClient.sendChatMessage(channel, content);
        }
    }
    
    /**
     * Send user activity
     */
    sendUserActivity(activityType, data) {
        if (this.wsClient) {
            this.wsClient.sendUserActivity(activityType, data);
        }
    }
}

// Create global dashboard integration instance
window.DashboardWebSocket = new DashboardWebSocketIntegration();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Detect dashboard type from URL
    const path = window.location.pathname;
    let dashboardType = 'general';
    
    if (path.includes('security')) dashboardType = 'security';
    else if (path.includes('performance')) dashboardType = 'performance';
    else if (path.includes('collaboration')) dashboardType = 'collaboration';
    else if (path.includes('cost')) dashboardType = 'cost';
    else if (path.includes('deployment')) dashboardType = 'deployment';
    
    // Initialize WebSocket integration
    window.DashboardWebSocket.initialize(dashboardType).catch(error => {
        console.warn('WebSocket integration failed to initialize:', error);
    });
});

console.log('📡 OpsSight WebSocket Client v2.0.0 loaded');