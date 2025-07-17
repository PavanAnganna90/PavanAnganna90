/**
 * Security Event Logger
 * 
 * Comprehensive security event logging and monitoring:
 * - Structured security event logging
 * - Threat intelligence integration
 * - Real-time alerting
 * - Security metrics collection
 * - Audit trail maintenance
 */

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  clientIP: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}

export type SecurityEventType = 
  | 'blocked_ip_access'
  | 'rate_limit_exceeded'
  | 'invalid_request'
  | 'ddos_attack_detected'
  | 'suspicious_bot_detected'
  | 'attack_pattern_detected'
  | 'authentication_failure'
  | 'authorization_failure'
  | 'data_breach_attempt'
  | 'malicious_file_upload'
  | 'suspicious_user_behavior'
  | 'privilege_escalation_attempt'
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'csrf_attack'
  | 'brute_force_attack'
  | 'account_lockout'
  | 'suspicious_login'
  | 'data_exfiltration_attempt';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

interface SecurityMetrics {
  totalEvents: number;
  eventsBySeverity: Record<SecuritySeverity, number>;
  eventsByType: Record<string, number>;
  topAttackerIPs: Array<{ ip: string; count: number }>;
  topTargetURLs: Array<{ url: string; count: number }>;
  attackTrends: Array<{ timestamp: Date; count: number }>;
}

interface ThreatIntelligence {
  maliciousIPs: Set<string>;
  suspiciousUserAgents: Set<string>;
  knownAttackPatterns: RegExp[];
  compromisedDomains: Set<string>;
}

export class SecurityLogger {
  private events: SecurityEvent[] = [];
  private alertThresholds: Record<SecurityEventType, number> = {
    blocked_ip_access: 10,
    rate_limit_exceeded: 50,
    invalid_request: 20,
    ddos_attack_detected: 1,
    suspicious_bot_detected: 5,
    attack_pattern_detected: 1,
    authentication_failure: 10,
    authorization_failure: 15,
    data_breach_attempt: 1,
    malicious_file_upload: 1,
    suspicious_user_behavior: 5,
    privilege_escalation_attempt: 1,
    sql_injection_attempt: 1,
    xss_attempt: 1,
    csrf_attack: 1,
    brute_force_attack: 1,
    account_lockout: 5,
    suspicious_login: 3,
    data_exfiltration_attempt: 1,
  };
  
  private threatIntel: ThreatIntelligence;
  private alertCallbacks: Array<(event: SecurityEvent) => void> = [];

  constructor() {
    this.threatIntel = {
      maliciousIPs: new Set(),
      suspiciousUserAgents: new Set(),
      knownAttackPatterns: [],
      compromisedDomains: new Set(),
    };
    
    this.loadThreatIntelligence();
    this.setupPeriodicCleanup();
  }

  logSecurityEvent(event: SecurityEvent): void {
    // Enrich event with additional context
    const enrichedEvent = this.enrichEvent(event);
    
    // Store event
    this.events.push(enrichedEvent);
    
    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Security] ${event.type}:`, {
        severity: event.severity,
        clientIP: event.clientIP,
        url: event.url,
        additionalData: event.additionalData,
      });
    }
    
    // Send to external logging services
    this.sendToExternalServices(enrichedEvent);
    
    // Check alert thresholds
    this.checkAlertThresholds(enrichedEvent);
    
    // Update threat intelligence
    this.updateThreatIntelligence(enrichedEvent);
    
    // Trigger alert callbacks
    this.triggerAlerts(enrichedEvent);
  }

  private enrichEvent(event: SecurityEvent): SecurityEvent {
    const enriched: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    // Add session ID if available
    if (typeof window !== 'undefined' && window.sessionStorage) {
      enriched.sessionId = window.sessionStorage.getItem('sessionId') || undefined;
    }

    // Add geolocation (in production, use IP geolocation service)
    enriched.geolocation = this.getGeolocation(event.clientIP);

    return enriched;
  }

  private getGeolocation(ip: string): SecurityEvent['geolocation'] | undefined {
    // In production, integrate with IP geolocation service like MaxMind
    // For now, return mock data for localhost
    if (ip === 'localhost' || ip === '127.0.0.1' || ip === '::1') {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
      };
    }
    
    return undefined;
  }

  private async sendToExternalServices(event: SecurityEvent): Promise<void> {
    try {
      // Send to Sentry for error tracking
      if (process.env.SENTRY_DSN) {
        const Sentry = await import('@sentry/nextjs').catch(() => null);
        if (Sentry) {
          Sentry.addBreadcrumb({
            category: 'security',
            message: event.type,
            level: event.severity === 'critical' ? 'error' : 'warning',
            data: {
              clientIP: event.clientIP,
              url: event.url,
              additionalData: event.additionalData,
            },
          });
        }
      }

      // Send to external SIEM (Security Information and Event Management)
      if (process.env.SIEM_WEBHOOK_URL) {
        await fetch(process.env.SIEM_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SIEM_API_KEY}`,
          },
          body: JSON.stringify({
            source: 'opssight-frontend',
            event,
            timestamp: event.timestamp.toISOString(),
          }),
        });
      }

      // Send to logging service (e.g., Elasticsearch, Splunk)
      if (process.env.LOG_ENDPOINT) {
        await fetch(process.env.LOG_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            '@timestamp': event.timestamp.toISOString(),
            event_type: 'security',
            severity: event.severity,
            security_event: event,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send security event to external services:', error);
    }
  }

  private checkAlertThresholds(event: SecurityEvent): void {
    const threshold = this.alertThresholds[event.type];
    if (!threshold) return;

    // Count recent events of the same type
    const recentEvents = this.getRecentEvents(event.type, 15 * 60 * 1000); // Last 15 minutes
    
    if (recentEvents.length >= threshold) {
      this.sendAlert({
        type: 'threshold_exceeded',
        message: `Security alert: ${event.type} threshold exceeded (${recentEvents.length}/${threshold})`,
        severity: 'high',
        events: recentEvents,
      });
    }
  }

  private updateThreatIntelligence(event: SecurityEvent): void {
    // Add IP to malicious list for certain event types
    const maliciousEventTypes: SecurityEventType[] = [
      'ddos_attack_detected',
      'attack_pattern_detected',
      'data_breach_attempt',
      'sql_injection_attempt',
      'xss_attempt',
    ];

    if (maliciousEventTypes.includes(event.type)) {
      this.threatIntel.maliciousIPs.add(event.clientIP);
    }

    // Add suspicious user agents
    if (event.type === 'suspicious_bot_detected') {
      this.threatIntel.suspiciousUserAgents.add(event.userAgent);
    }
  }

  private triggerAlerts(event: SecurityEvent): void {
    // High-severity events trigger immediate alerts
    if (event.severity === 'critical' || event.severity === 'high') {
      this.alertCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Alert callback failed:', error);
        }
      });
    }
  }

  private async sendAlert(alert: {
    type: string;
    message: string;
    severity: string;
    events: SecurityEvent[];
  }): Promise<void> {
    try {
      // Send to Slack/Teams/Discord webhook
      if (process.env.SECURITY_ALERT_WEBHOOK) {
        await fetch(process.env.SECURITY_ALERT_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `🚨 ${alert.message}`,
            attachments: [
              {
                color: alert.severity === 'critical' ? 'danger' : 'warning',
                fields: [
                  {
                    title: 'Event Count',
                    value: alert.events.length,
                    short: true,
                  },
                  {
                    title: 'Time Window',
                    value: 'Last 15 minutes',
                    short: true,
                  },
                ],
              },
            ],
          }),
        });
      }

      // Send email alert for critical events
      if (alert.severity === 'critical' && process.env.ALERT_EMAIL_ENDPOINT) {
        await fetch(process.env.ALERT_EMAIL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: process.env.SECURITY_EMAIL,
            subject: `CRITICAL: Security Alert - ${alert.type}`,
            body: alert.message,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  private loadThreatIntelligence(): void {
    // In production, load from threat intelligence feeds
    // For now, add some common malicious IPs and patterns
    const knownMaliciousIPs = [
      '0.0.0.0',
      '192.168.1.1', // Example - replace with real threat intel
    ];

    knownMaliciousIPs.forEach(ip => {
      this.threatIntel.maliciousIPs.add(ip);
    });

    // Add known attack patterns
    this.threatIntel.knownAttackPatterns = [
      /union.*select/i,
      /<script.*>/i,
      /javascript:/i,
      /onclick=/i,
      /onerror=/i,
    ];
  }

  private setupPeriodicCleanup(): void {
    // Clean up old events every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      this.events = this.events.filter(event => event.timestamp > cutoff);
    }, 60 * 60 * 1000);
  }

  // Public methods
  getRecentEvents(type?: SecurityEventType, timeWindowMs: number = 60 * 60 * 1000): SecurityEvent[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.events.filter(event => {
      const matchesTime = event.timestamp > cutoff;
      const matchesType = !type || event.type === type;
      return matchesTime && matchesType;
    });
  }

  getSecurityMetrics(timeWindowMs: number = 24 * 60 * 60 * 1000): SecurityMetrics {
    const recentEvents = this.getRecentEvents(undefined, timeWindowMs);
    
    const eventsBySeverity: Record<SecuritySeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const eventsByType: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};
    const urlCounts: Record<string, number> = {};

    recentEvents.forEach(event => {
      eventsBySeverity[event.severity]++;
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      ipCounts[event.clientIP] = (ipCounts[event.clientIP] || 0) + 1;
      urlCounts[event.url] = (urlCounts[event.url] || 0) + 1;
    });

    const topAttackerIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    const topTargetURLs = Object.entries(urlCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([url, count]) => ({ url, count }));

    // Calculate attack trends (hourly buckets)
    const attackTrends: Array<{ timestamp: Date; count: number }> = [];
    const hourMs = 60 * 60 * 1000;
    const hours = Math.ceil(timeWindowMs / hourMs);
    
    for (let i = 0; i < hours; i++) {
      const bucketStart = new Date(Date.now() - (i + 1) * hourMs);
      const bucketEnd = new Date(Date.now() - i * hourMs);
      const bucketEvents = recentEvents.filter(
        event => event.timestamp >= bucketStart && event.timestamp < bucketEnd
      );
      
      attackTrends.unshift({
        timestamp: bucketStart,
        count: bucketEvents.length,
      });
    }

    return {
      totalEvents: recentEvents.length,
      eventsBySeverity,
      eventsByType,
      topAttackerIPs,
      topTargetURLs,
      attackTrends,
    };
  }

  onSecurityAlert(callback: (event: SecurityEvent) => void): () => void {
    this.alertCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  isMaliciousIP(ip: string): boolean {
    return this.threatIntel.maliciousIPs.has(ip);
  }

  isSuspiciousUserAgent(userAgent: string): boolean {
    return this.threatIntel.suspiciousUserAgents.has(userAgent) ||
           this.threatIntel.knownAttackPatterns.some(pattern => pattern.test(userAgent));
  }

  exportSecurityReport(timeWindowMs: number = 24 * 60 * 60 * 1000): object {
    const metrics = this.getSecurityMetrics(timeWindowMs);
    const recentEvents = this.getRecentEvents(undefined, timeWindowMs);
    
    return {
      reportTimestamp: new Date().toISOString(),
      timeWindow: `${timeWindowMs / (60 * 60 * 1000)} hours`,
      metrics,
      recentEvents: recentEvents.slice(-100), // Last 100 events
      threatIntelligence: {
        maliciousIPCount: this.threatIntel.maliciousIPs.size,
        suspiciousUserAgentCount: this.threatIntel.suspiciousUserAgents.size,
        knownAttackPatternCount: this.threatIntel.knownAttackPatterns.length,
      },
    };
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();

export default SecurityLogger;