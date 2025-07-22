# OpsSight DevOps Platform - Deployment Guide

## 🎯 Current Status

✅ **Application Successfully Prepared for Deployment**

- ✅ Development server running on `http://localhost:3000`
- ✅ Production build configuration optimized
- ✅ Docker multi-stage build ready
- ✅ Environment variables configured
- ✅ Security headers and CSP implemented
- ✅ PWA support enabled
- ✅ All critical runtime errors fixed

## 🚀 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Features:**
- ✅ Zero-config Next.js deployment
- ✅ Automatic SSL/TLS
- ✅ Global CDN
- ✅ Serverless functions
- ✅ Preview deployments

### Option 2: Docker Deployment

```bash
# Build production image
docker build --target production -t opssight:latest .

# Run container
docker run -p 3000:80 opssight:latest

# Or use docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Features:**
- ✅ Full stack deployment
- ✅ PostgreSQL + Redis included
- ✅ Monitoring with Prometheus/Grafana
- ✅ Log aggregation with Loki
- ✅ Production-ready configuration

### Option 3: Static Export (For Static Hosting)

```bash
# Configure next.config.js for static export
# Add: output: 'export'

# Build and export
npm run build
```

Deploy the `out/` folder to any static hosting provider.

### Option 4: Self-Hosted Node.js

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Basic Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=OpsSight
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=production

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_MONITORING=true
NEXT_PUBLIC_ENABLE_DARK_MODE=true
NEXT_PUBLIC_ENABLE_THEMES=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true

# Disable telemetry
NEXT_TELEMETRY_DISABLED=1
```

### Optional Integration Variables

```bash
# Error Tracking
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production

# Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS=GA-TRACKING-ID

# Monitoring
GRAFANA_API_TOKEN=your-grafana-token
PROMETHEUS_URL=your-prometheus-url
```

## 📊 Performance Optimizations

### Enabled Features

- ✅ **Bundle Analysis**: `npm run analyze`
- ✅ **Code Splitting**: Automatic chunk optimization
- ✅ **Tree Shaking**: Unused code elimination
- ✅ **Image Optimization**: WebP/AVIF support
- ✅ **Compression**: Gzip/Brotli enabled
- ✅ **Caching**: Static asset caching (1 year)
- ✅ **Minification**: CSS/JS minification
- ✅ **Font Optimization**: Google Fonts optimization

### Build Output

```
Page                                       Size     First Load JS
┌ ○ /                                      XX kB          XX kB
├ ○ /dashboard                             XX kB          XX kB
├ ○ /teams                                 XX kB          XX kB
├ ○ /auth/login                            XX kB          XX kB
└ ○ /monitoring                            XX kB          XX kB

+ First Load JS shared by all              XX kB
  ├ chunks/framework-XXXX.js               XX kB
  ├ chunks/main-XXXX.js                    XX kB
  ├ chunks/pages/_app-XXXX.js              XX kB
  └ chunks/webpack-XXXX.js                 XX kB
```

## 🔒 Security Features

### Implemented Headers

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [Comprehensive CSP rules]
```

### Security Middleware

- ✅ CORS protection
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ JWT token validation
- ✅ HTTPS redirection
- ✅ Security headers

## 🏥 Health Checks

### Application Health

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-01-20T23:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Monitoring Endpoints

- `/api/health` - Application health
- `/api/metrics` - Prometheus metrics
- `/api/version` - Application version info

## 🚦 Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] SSL certificate ready
- [ ] Domain DNS configured
- [ ] Database credentials set
- [ ] Third-party API keys configured
- [ ] Monitoring tools connected

### Post-Deployment

- [ ] Application loads successfully
- [ ] All pages render correctly
- [ ] API endpoints respond
- [ ] Authentication works
- [ ] Real-time features functional
- [ ] Error tracking operational
- [ ] Monitoring dashboards active
- [ ] Performance metrics baseline

## 🎛️ Recommended Deployment Flow

### Production Deployment

1. **Local Testing**
   ```bash
   npm run build
   npm run start
   ```

2. **Staging Deployment**
   ```bash
   vercel --target staging
   ```

3. **Production Release**
   ```bash
   vercel --prod
   ```

### Rollback Strategy

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url]
```

## 📈 Scaling Considerations

### Horizontal Scaling

- Use Docker Swarm or Kubernetes
- Configure load balancer
- Enable session clustering
- Scale database connections

### Performance Monitoring

- Set up Grafana dashboards
- Configure Prometheus alerts
- Monitor Core Web Vitals
- Track error rates

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors
   - Verify environment variables
   - Clear .next cache

2. **Runtime Errors**
   - Check browser console
   - Verify API endpoints
   - Check network connectivity

3. **Performance Issues**
   - Analyze bundle size
   - Check Core Web Vitals
   - Optimize images

### Support

- **Documentation**: See `/docs` folder
- **Health Check**: `GET /api/health`
- **Logs**: Check application logs
- **Monitoring**: Grafana dashboards

---

## 🎉 Deployment Complete!

Your OpsSight DevOps Platform is now ready for production deployment. Choose the deployment option that best fits your infrastructure requirements.

**Demo URL**: Will be available after deployment
**Admin Access**: Configure through environment variables
**Support**: Check logs and monitoring dashboards