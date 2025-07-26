# Frontend-Backend Integration Guide

## Overview

This guide documents the complete integration between the OpsSight frontend dashboard and the enterprise-grade backend architecture. The integration provides real-time monitoring, advanced caching, and comprehensive authentication flow.

## Architecture Components

### Frontend (Next.js)
- **Modern Dashboard Shell**: Professional navigation with glassmorphism effects
- **Enhanced API Client**: Multi-level caching with retry logic and performance tracking
- **Real-time WebSocket**: Live metrics and deployment updates
- **Authentication Integration**: OAuth flow with JWT token management

### Backend (FastAPI)
- **Enterprise Architecture**: Multi-level caching, auto-scaling, and circuit breakers
- **Advanced Security**: Zero-trust model with adaptive authentication
- **Performance Optimized**: p95 < 200ms response times, 10,000+ req/s throughput
- **Production Ready**: Comprehensive observability and health monitoring

## Integration Features

### 1. API Client Enhancement (`/frontend/src/services/apiService.ts`)

#### Key Features:
- **Multi-level Caching**: Memory + Redis with automatic promotion
- **Retry Logic**: Exponential backoff with configurable attempts
- **Performance Tracking**: Request ID and process time monitoring
- **Type Safety**: Full TypeScript interfaces for all endpoints

#### Usage:
```typescript
import { apiService } from '@/services/apiService';

// Cached request with TTL
const metrics = await apiService.getDashboardMetrics();

// Real-time data (no cache)
const liveData = await apiService.getRealTimeMetrics();

// Cache management
apiService.clearCache('/metrics'); // Clear specific endpoint
apiService.clearCache(); // Clear all cache
```

#### Endpoints:
- `getDashboardMetrics()`: Comprehensive system metrics (1min cache)
- `getCacheMetrics()`: Backend cache performance
- `getApiPerformance()`: API response time and configuration
- `getServiceHealth()`: Service status monitoring (1min cache)
- `getDeployments()`: Deployment status (1min cache)
- `invalidateCache()`: Trigger backend cache invalidation

### 2. Real-time Data Connections

#### WebSocket Service (`/frontend/src/services/realtimeService.ts`)

```typescript
import { realtimeService } from '@/services/realtimeService';

// Connect with authentication
await realtimeService.connect(authToken);

// Subscribe to metrics updates
const unsubscribe = realtimeService.subscribe('metrics', (data) => {
  console.log('Live metrics:', data);
});

// Request specific updates
realtimeService.requestMetrics();
realtimeService.requestDeploymentStatus();
```

#### React Hook (`/frontend/src/hooks/useRealTimeMetrics.ts`)

```typescript
import { useRealTimeMetrics } from '@/hooks/useRealTimeMetrics';

function Dashboard() {
  const { data, error, connect, isConnected } = useRealTimeMetrics({
    autoConnect: true,
    requestInterval: 5000
  });

  return (
    <div>
      <p>Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>CPU Usage: {data.metrics?.cpu_usage}%</p>
      <p>Cache Hit Rate: {data.metrics?.cache_hit_rate}%</p>
    </div>
  );
}
```

### 3. Authentication Flow Enhancement

#### API Service Integration
- Automatic token management in API service
- Cache invalidation on logout
- Request header injection

#### Auth Context Updates
```typescript
// Automatic API service token management
const storeAuthData = (user: User, tokens: AuthTokens) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
  apiService.setAuthToken(tokens.access_token); // Auto-sync
};

const clearStoredAuth = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  apiService.setAuthToken(null);
  apiService.clearCache(); // Clear authenticated data
};
```

### 4. Dashboard Components Integration

#### Enhanced Dashboard Page (`/frontend/src/app/dashboard/page.tsx`)
- Real backend data integration
- Dynamic service status
- Live deployment tracking
- Cache performance metrics

#### MetricsOverview Component (`/frontend/src/components/dashboard/MetricsOverview.tsx`)
- Backend metrics integration
- Cache hit rate display
- API performance monitoring
- Real-time updates

## Configuration

### Environment Variables

#### Frontend (`.env.local`)
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000

# Performance Settings
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_CACHE_TTL=300000
NEXT_PUBLIC_RETRY_ATTEMPTS=3

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
NEXT_PUBLIC_ENABLE_ADVANCED_MONITORING=true
```

#### Backend
Ensure backend is configured with:
- CORS origins including frontend URL
- WebSocket endpoint `/ws/dashboard`
- Cache metrics endpoint `/cache/metrics`
- API performance endpoint `/api/performance`

### Docker Configuration

Updated `docker-compose.yml` with:
```yaml
frontend:
  environment:
    - NEXT_PUBLIC_API_BASE_URL=http://backend:8000/api/v1
    - NEXT_PUBLIC_WS_BASE_URL=ws://backend:8000
    - NEXT_PUBLIC_ENABLE_REAL_TIME=true
    - NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
```

## Testing Integration

### Integration Test Script
Run the comprehensive integration test:

```bash
# Install dependencies
npm install node-fetch

# Run integration tests
node test-integration.js

# With custom URLs
BACKEND_URL=http://localhost:8000 FRONTEND_URL=http://localhost:3000 node test-integration.js
```

### Test Coverage
- ✅ Backend health endpoints
- ✅ Cache metrics endpoint
- ✅ API performance endpoint
- ✅ OAuth providers endpoint
- ✅ Frontend health check
- ✅ Authentication flow
- ✅ Real-time connections

## Performance Metrics

### Expected Performance
- **API Response Time**: p95 < 200ms, p99 < 500ms
- **Cache Hit Rate**: > 85%
- **WebSocket Latency**: < 50ms
- **Frontend Load Time**: < 2s initial, < 500ms subsequent

### Monitoring
- Request performance tracking via `X-Request-ID` headers
- Cache metrics available at `/cache/metrics`
- Real-time performance data via WebSocket
- Error tracking and retry statistics

## Troubleshooting

### Common Issues

#### 1. API Connection Failed
- Check `NEXT_PUBLIC_API_BASE_URL` environment variable
- Verify backend is running on correct port
- Check CORS configuration in backend

#### 2. WebSocket Connection Failed
- Verify `NEXT_PUBLIC_WS_BASE_URL` is correct
- Check backend WebSocket endpoint `/ws/dashboard`
- Ensure authentication token is valid

#### 3. Cache Metrics Not Loading
- Verify backend has cache metrics endpoint
- Check if cache system is properly initialized
- Review backend logs for cache errors

#### 4. Authentication Issues
- Clear localStorage and retry login
- Check OAuth provider configuration
- Verify JWT token expiration

### Health Check Commands

```bash
# Test backend health
curl http://localhost:8000/health

# Test detailed health
curl http://localhost:8000/health/detailed

# Test cache metrics
curl http://localhost:8000/cache/metrics

# Test API performance
curl http://localhost:8000/api/performance
```

## Development Workflow

### 1. Start Services
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Verify Integration
```bash
# Run integration tests
node test-integration.js
```

### 3. Monitor Performance
- Dashboard: http://localhost:3000/dashboard
- Backend Health: http://localhost:8000/health/detailed
- Cache Metrics: http://localhost:8000/cache/metrics

## Production Deployment

### Prerequisites
- PostgreSQL database configured
- Redis cache system running
- Environment variables properly set
- SSL certificates for HTTPS/WSS

### Deployment Checklist
- [ ] Backend health endpoints responding
- [ ] Frontend environment variables configured
- [ ] WebSocket connection working
- [ ] Authentication flow tested
- [ ] Cache system operational
- [ ] Performance metrics within targets
- [ ] Integration tests passing

## Support

For integration issues:
1. Check the integration test results
2. Review backend and frontend logs
3. Verify environment configuration
4. Test individual components separately
5. Check network connectivity and CORS settings

The integration provides a robust, enterprise-grade connection between the modern dashboard frontend and the high-performance backend architecture.