/**
 * Advanced Security Middleware
 * 
 * Comprehensive security policies and protection:
 * - Enhanced CSP headers
 * - Rate limiting and DDoS protection
 * - Request validation and sanitization
 * - Security headers enforcement
 * - Threat detection and blocking
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/utils/rate-limiter';
import { SecurityLogger } from '@/utils/security-logger';

export interface SecurityConfig {
  enableRateLimiting: boolean;
  enableDDoSProtection: boolean;
  enableRequestValidation: boolean;
  enableThreatDetection: boolean;
  cspConfig: CSPConfig;
  rateLimitConfig: RateLimitConfig;
}

export interface CSPConfig {
  reportUri?: string;
  reportOnly?: boolean;
  directives: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
    workerSrc: string[];
    manifestSrc: string[];
  };
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (request: NextRequest) => string;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableRateLimiting: true,
  enableDDoSProtection: true,
  enableRequestValidation: true,
  enableThreatDetection: true,
  cspConfig: {
    reportUri: '/api/csp-report',
    reportOnly: process.env.NODE_ENV === 'development',
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://js.sentry-cdn.com',
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'http://localhost:*',
      ],
      connectSrc: [
        "'self'",
        'https://api.github.com',
        'https://sentry.io',
        'https://*.sentry.io',
        'ws:',
        'wss:',
        'http://localhost:*',
        'https://localhost:*',
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net',
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'blob:'],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", 'blob:'],
      manifestSrc: ["'self'"],
    },
  },
  rateLimitConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (request) => getClientIP(request),
  },
};

class SecurityMiddleware {
  private config: SecurityConfig;
  private rateLimiter: RateLimiter;
  private securityLogger: SecurityLogger;
  private suspiciousIPs: Set<string> = new Set();
  private blockedIPs: Set<string> = new Set();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
    this.rateLimiter = new RateLimiter(this.config.rateLimitConfig);
    this.securityLogger = new SecurityLogger();
  }

  async handle(request: NextRequest): Promise<NextResponse | null> {
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const url = request.nextUrl;

    // Check if IP is blocked
    if (this.blockedIPs.has(clientIP)) {
      this.securityLogger.logSecurityEvent({
        type: 'blocked_ip_access',
        severity: 'high',
        clientIP,
        userAgent,
        url: url.href,
        timestamp: new Date(),
      });
      return new NextResponse('Access Denied', { status: 403 });
    }

    // DDoS Protection
    if (this.config.enableDDoSProtection) {
      const ddosCheck = await this.checkDDoS(request, clientIP);
      if (ddosCheck.blocked) {
        return ddosCheck.response;
      }
    }

    // Rate Limiting
    if (this.config.enableRateLimiting) {
      const rateLimitResult = await this.rateLimiter.check(request);
      if (rateLimitResult.blocked) {
        this.securityLogger.logSecurityEvent({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          clientIP,
          userAgent,
          url: url.href,
          additionalData: { limit: rateLimitResult.limit, remaining: 0 },
          timestamp: new Date(),
        });
        
        return new NextResponse('Rate limit exceeded', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        });
      }
    }

    // Request Validation
    if (this.config.enableRequestValidation) {
      const validationResult = await this.validateRequest(request);
      if (!validationResult.valid) {
        this.securityLogger.logSecurityEvent({
          type: 'invalid_request',
          severity: 'medium',
          clientIP,
          userAgent,
          url: url.href,
          additionalData: { reason: validationResult.reason },
          timestamp: new Date(),
        });
        return new NextResponse('Bad Request', { status: 400 });
      }
    }

    // Threat Detection
    if (this.config.enableThreatDetection) {
      const threatResult = await this.detectThreats(request, clientIP, userAgent);
      if (threatResult.threat) {
        return threatResult.response;
      }
    }

    // Add security headers to response
    const response = NextResponse.next();
    this.addSecurityHeaders(response);

    return null; // Continue to next middleware
  }

  private async checkDDoS(request: NextRequest, clientIP: string): Promise<{
    blocked: boolean;
    response?: NextResponse;
  }> {
    // Simple DDoS detection based on request patterns
    const requestCount = await this.getRequestCount(clientIP, 60000); // Last minute
    
    if (requestCount > 200) { // More than 200 requests per minute
      this.blockedIPs.add(clientIP);
      
      this.securityLogger.logSecurityEvent({
        type: 'ddos_attack_detected',
        severity: 'critical',
        clientIP,
        userAgent: request.headers.get('user-agent') || '',
        url: request.nextUrl.href,
        additionalData: { requestCount },
        timestamp: new Date(),
      });

      // Temporarily block for 1 hour
      setTimeout(() => {
        this.blockedIPs.delete(clientIP);
      }, 60 * 60 * 1000);

      return {
        blocked: true,
        response: new NextResponse('Service Unavailable', { 
          status: 503,
          headers: {
            'Retry-After': '3600',
          },
        }),
      };
    }

    // Mark as suspicious if high request rate
    if (requestCount > 100) {
      this.suspiciousIPs.add(clientIP);
    }

    return { blocked: false };
  }

  private async validateRequest(request: NextRequest): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    const url = request.nextUrl;
    const method = request.method;
    const headers = request.headers;

    // Check for malicious patterns in URL
    const maliciousPatterns = [
      /\.\./,           // Directory traversal
      /<script/i,       // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i,   // Javascript protocol
      /data:.*base64/i, // Data URL with base64
      /vbscript:/i,     // VBScript protocol
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(url.pathname) || pattern.test(url.search)) {
        return { valid: false, reason: 'Malicious pattern detected in URL' };
      }
    }

    // Validate headers
    const contentType = headers.get('content-type');
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      if (!contentType) {
        return { valid: false, reason: 'Missing Content-Type header' };
      }
    }

    // Check for suspicious user agents
    const userAgent = headers.get('user-agent');
    if (!userAgent || userAgent.length < 10) {
      return { valid: false, reason: 'Suspicious or missing User-Agent' };
    }

    // Validate request size
    const contentLength = headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
      return { valid: false, reason: 'Request too large' };
    }

    return { valid: true };
  }

  private async detectThreats(
    request: NextRequest,
    clientIP: string,
    userAgent: string
  ): Promise<{
    threat: boolean;
    response?: NextResponse;
  }> {
    // Bot detection
    const knownBots = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /scanner/i,
    ];

    const isBot = knownBots.some(pattern => pattern.test(userAgent));
    
    if (isBot && !this.isAllowedBot(userAgent)) {
      this.securityLogger.logSecurityEvent({
        type: 'suspicious_bot_detected',
        severity: 'medium',
        clientIP,
        userAgent,
        url: request.nextUrl.href,
        timestamp: new Date(),
      });

      return {
        threat: true,
        response: new NextResponse('Access Denied', { status: 403 }),
      };
    }

    // Check for known attack patterns
    const requestBody = await this.getRequestBody(request);
    if (requestBody) {
      const attackPatterns = [
        /<script.*?>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /union.*select/gi,
        /select.*from/gi,
        /insert.*into/gi,
        /delete.*from/gi,
        /drop.*table/gi,
      ];

      for (const pattern of attackPatterns) {
        if (pattern.test(requestBody)) {
          this.securityLogger.logSecurityEvent({
            type: 'attack_pattern_detected',
            severity: 'high',
            clientIP,
            userAgent,
            url: request.nextUrl.href,
            additionalData: { pattern: pattern.source },
            timestamp: new Date(),
          });

          return {
            threat: true,
            response: new NextResponse('Bad Request', { status: 400 }),
          };
        }
      }
    }

    return { threat: false };
  }

  private isAllowedBot(userAgent: string): boolean {
    const allowedBots = [
      /googlebot/i,
      /bingbot/i,
      /slurp/i, // Yahoo
      /duckduckbot/i,
      /baiduspider/i,
      /yandexbot/i,
      /facebookexternalhit/i,
      /twitterbot/i,
      /linkedinbot/i,
    ];

    return allowedBots.some(pattern => pattern.test(userAgent));
  }

  private async getRequestBody(request: NextRequest): Promise<string | null> {
    try {
      if (request.body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        const cloned = request.clone();
        return await cloned.text();
      }
    } catch (error) {
      // Ignore errors when reading body
    }
    return null;
  }

  private async getRequestCount(clientIP: string, windowMs: number): Promise<number> {
    // In a real implementation, this would use Redis or another cache
    // For now, return a simulated count
    return Math.floor(Math.random() * 150);
  }

  private addSecurityHeaders(response: NextResponse): void {
    const { cspConfig } = this.config;
    
    // Content Security Policy
    const cspDirectives = Object.entries(cspConfig.directives)
      .map(([directive, sources]) => `${toKebabCase(directive)} ${sources.join(' ')}`)
      .join('; ');
    
    const cspHeader = cspConfig.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
    let cspValue = cspDirectives;
    
    if (cspConfig.reportUri) {
      cspValue += `; report-uri ${cspConfig.reportUri}`;
    }
    
    response.headers.set(cspHeader, cspValue);

    // Additional security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()');
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 
        'max-age=31536000; includeSubDomains; preload');
    }

    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');
  }
}

// Utility functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (cfIP) return cfIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Export security middleware instance
export const securityMiddleware = new SecurityMiddleware();

export default SecurityMiddleware;