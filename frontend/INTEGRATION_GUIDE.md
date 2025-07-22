# 🚀 OpsSight Production Integration Guide

## Overview

This guide provides comprehensive instructions for integrating all production-ready components of the OpsSight DevOps Visibility Platform.

## ✅ Completed Integrations

### 1. Database Integration ✅
- **PostgreSQL** connection and pool management
- **Redis** session management and caching
- Health check endpoints for both services
- Connection retry and error handling

### 2. Monitoring & Metrics ✅
- **Prometheus** metrics collection (`/api/metrics`)
- **Grafana** dashboards and data sources
- Custom business and performance metrics
- Alert rules for critical system events

### 3. Error Tracking ✅
- **Sentry** client and server configuration
- Custom error tracking with context
- Performance monitoring and session replay
- Global error handlers for unhandled exceptions

### 4. CI/CD Pipeline ✅
- **GitHub Actions** comprehensive workflow
- Multi-stage testing (unit, integration, E2E, security)
- Docker image building and security scanning
- Automated deployment with rollback capabilities

### 5. Backup Strategy ✅
- **Automated daily backups** for database and Redis
- Configuration and code backups
- S3 storage with retention policies
- Backup verification and monitoring

---

## 🔧 Quick Setup Guide

### 1. Environment Configuration

```bash
# Copy and configure environment variables
cp .env.example .env.local

# Configure required variables:
# - Database credentials (PostgreSQL)
# - Redis connection details
# - Sentry DSN for error tracking
# - AWS credentials for backups
```

### 2. Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify connections
npm run health-check
```

### 3. Monitoring Setup

```bash
# Start monitoring stack
docker-compose up -d prometheus grafana

# Access Grafana dashboard
open http://localhost:3000 # Grafana UI
# Default: admin/admin
```

### 4. Deploy Application

```bash
# Production build
npm run build

# Start with all integrations
npm run start

# Verify all endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/metrics
```

---

## 📊 Monitoring Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/api/health` | System health status | JSON with service statuses |
| `/api/metrics` | Prometheus metrics | Prometheus format metrics |
| `/api/version` | Application version | Version and build info |

---

## 🔐 Security Features

### Implemented Security Measures

- ✅ **Session Management**: Redis-based secure sessions
- ✅ **Error Tracking**: Sanitized error reporting via Sentry
- ✅ **Security Headers**: CSP, HSTS, XSS protection
- ✅ **Input Validation**: Type-safe API endpoints
- ✅ **Dependency Scanning**: Automated security audits
- ✅ **Container Scanning**: Trivy vulnerability scanning

### Security Headers Active

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: [Comprehensive rules]
```

---

## 📈 Performance Metrics

### Key Metrics Collected

- **Application Metrics**
  - HTTP request rates and latencies
  - Active users and sessions
  - Database connection pool status
  - WebSocket connection counts

- **Business Metrics**
  - Dashboard view counts
  - API usage patterns
  - Deployment event tracking
  - Error rates by component

- **Infrastructure Metrics**
  - Memory and CPU usage
  - Kubernetes pod status
  - Cloud cost tracking
  - Database performance

---

## 🚨 Alerting Rules

### Critical Alerts
- Application down (1 minute)
- Database/Redis connection failure (1 minute)
- High error rate (>10% for 2 minutes)

### Warning Alerts
- High response time (>2s for 5 minutes)
- High memory usage (>512MB for 5 minutes)
- High CPU usage (>80% for 5 minutes)

---

## 🔄 CI/CD Workflow

### Automated Pipeline

1. **Code Quality**
   - ESLint, Prettier, TypeScript checks
   - Security audits and dependency scanning

2. **Testing**
   - Unit tests with coverage
   - Integration tests with database
   - E2E tests with Playwright
   - Security tests

3. **Building**
   - Docker image creation
   - Vulnerability scanning with Trivy
   - Multi-platform builds

4. **Deployment**
   - Staging environment deployment
   - Production deployment on release
   - Smoke tests and health checks

### Branch Strategy
- `develop` → Staging deployment
- `main` → Production deployment
- `release/*` → Full production release

---

## 💾 Backup Strategy

### Automated Backups

- **Daily Schedules**: 2 AM UTC
- **Retention**: 30 days
- **Components**:
  - PostgreSQL database dumps
  - Redis data snapshots
  - Application configurations
  - Docker images and manifests

### Verification
- Automated integrity checks
- Backup size validation
- Restoration testing (manual)

---

## 🎯 Integration Checklist

### Development Environment
- [ ] PostgreSQL running and accessible
- [ ] Redis running and accessible
- [ ] Environment variables configured
- [ ] Sentry project created
- [ ] Grafana dashboards imported

### Staging Environment
- [ ] CI/CD pipeline configured
- [ ] Staging database provisioned
- [ ] Monitoring stack deployed
- [ ] Backup strategy tested
- [ ] Health checks passing

### Production Environment
- [ ] Production database secured
- [ ] SSL certificates configured
- [ ] Monitoring alerts active
- [ ] Backup automation running
- [ ] Performance baselines established

---

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failures**
   ```bash
   # Check connection
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   
   # Verify environment variables
   echo $DB_HOST $DB_PORT $DB_NAME
   ```

2. **Redis Connection Issues**
   ```bash
   # Test Redis connection
   redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
   ```

3. **Metrics Not Appearing**
   ```bash
   # Check metrics endpoint
   curl http://localhost:3000/api/metrics
   
   # Verify Prometheus scraping
   curl http://localhost:9090/targets
   ```

4. **Sentry Not Receiving Errors**
   ```bash
   # Check DSN configuration
   echo $NEXT_PUBLIC_SENTRY_DSN
   
   # Test error tracking
   npm run test:error-tracking
   ```

### Health Check Commands

```bash
# Application health
curl -f http://localhost:3000/api/health || echo "App unhealthy"

# Database connectivity  
npm run health-check:db

# Redis connectivity
npm run health-check:redis

# Full system check
npm run health-check:all
```

---

## 📚 Additional Resources

### Documentation
- [Deployment Guide](./DEPLOYMENT.md)
- [Monitoring Setup](./monitoring/README.md)
- [Security Best Practices](./docs/security.md)
- [Performance Tuning](./docs/performance.md)

### External Links
- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)

---

## 🎉 Success Criteria

✅ **All integrations successfully implemented!**

The OpsSight platform now includes:
- Robust database and caching layer
- Comprehensive monitoring and alerting
- Production-grade error tracking
- Automated CI/CD pipeline
- Enterprise backup strategy

**Ready for production deployment! 🚀**

---

*Last Updated: January 2025*
*Integration Status: Complete*