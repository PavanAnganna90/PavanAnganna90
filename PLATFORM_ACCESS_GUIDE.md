# 🚀 OpsSight Platform - How to Access and Test All Features

## 📊 Current Status
✅ **Infrastructure Services**: PostgreSQL, Redis, Prometheus, Grafana all running  
🎯 **Platform Health**: 100% (all core services operational)  
🔧 **Ready for**: Development, testing, and full feature exploration

---

## 🎯 Quick Access - Main Services

### 🎨 **Frontend Application** 
```bash
# Option 1: Start with our launcher script
./start-local-dev.sh

# Option 2: Start manually
cd frontend && npm install && npm run dev
```
**Access**: http://localhost:3000
- Full React/Next.js interface
- Real-time dashboards
- User management
- Project views

### 🔧 **Backend API**
```bash
# Option 1: Use launcher script (recommended)
./start-local-dev.sh

# Option 2: Start manually  
cd backend && source venv/bin/activate && python -m uvicorn app.main:app --reload --port 8000
```
**Access**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/v1/health

---

## 📈 Monitoring & DevOps Tools

### **Grafana Dashboard**
**URL**: http://localhost:3001  
**Login**: admin / admin123
- Pre-configured dashboards
- Real-time metrics visualization
- Custom dashboard creation
- Alert management

### **Prometheus Metrics**
**URL**: http://localhost:9090
- Metrics collection and querying
- Target discovery
- Alert rules (when enabled)
- Service monitoring

### **Database Management**
- **PostgreSQL**: localhost:5432
  - Username: `opssight`
  - Password: `opssight123`
  - Database: `opssight_dev`

- **Redis Cache**: localhost:6379
  - No authentication required
  - Used for session storage and caching

---

## 🧪 Testing All Features

### 1. **API Testing with Puppeteer**
```bash
# Run our comprehensive test suite
node test-services.js

# Expected output: 100% success rate
```

### 2. **Manual API Testing**
```bash
# Health checks
curl http://localhost:8000/api/v1/health
curl http://localhost:9090/api/v1/status/config

# Explore API endpoints
open http://localhost:8000/docs
```

### 3. **Frontend Testing**
```bash
# Open the main application
open http://localhost:3000

# Check if frontend connects to backend
# Look for API calls in browser dev tools
```

---

## 🔧 Feature Exploration Guide

### **1. Dashboard Features**
- **URL**: http://localhost:3000/dashboard
- **Features**:
  - Real-time system metrics
  - Project status overview
  - Recent activity feed
  - Quick action buttons

### **2. DevOps Integrations**
- **Kubernetes Integration**: Connected to local cluster
- **Terraform Support**: Infrastructure as code
- **CI/CD Monitoring**: Pipeline status and history
- **Alert Management**: Incident response

### **3. User Management**
- **URL**: http://localhost:3000/users
- **Features**:
  - User registration/login
  - Role-based access control
  - Team management
  - Permission settings

### **4. Project Management**
- **URL**: http://localhost:3000/projects
- **Features**:
  - Project creation and configuration
  - Environment management
  - Deployment tracking
  - Resource allocation

### **5. Monitoring & Alerts**
- **URL**: http://localhost:3000/monitoring
- **Features**:
  - Custom metric dashboards
  - Alert configuration
  - Incident history
  - Performance analytics

---

## 🛠️ Development Workflow

### **Starting Development**
```bash
# 1. Start infrastructure services
docker-compose -f docker-compose.local.yml up -d postgres redis prometheus grafana

# 2. Start application services
./start-local-dev.sh

# 3. Open multiple tabs:
# - Frontend: http://localhost:3000
# - Backend Docs: http://localhost:8000/docs  
# - Grafana: http://localhost:3001
# - Prometheus: http://localhost:9090
```

### **Live Development**
- ✅ **Hot Reload**: Both frontend and backend support live reloading
- ✅ **Database**: Persistent data across restarts
- ✅ **Debugging**: Full source maps and debug info available
- ✅ **API Testing**: Interactive Swagger UI for immediate testing

---

## 🎮 Interactive Demo Features

### **1. Real-time Dashboards**
- Visit Grafana at http://localhost:3001
- Import sample dashboards from `monitoring/grafana/dashboards/`
- Watch live metrics updating

### **2. API Exploration**
- Open http://localhost:8000/docs
- Try the interactive API endpoints
- Use "Try it out" buttons to test requests

### **3. Database Interaction**
- Backend automatically creates sample data
- Use API endpoints to create/read/update data
- View data persistence across restarts

### **4. Monitoring Setup**
- Check Prometheus targets at http://localhost:9090/targets
- Create custom queries and graphs
- Set up alerts (when alert rules are enabled)

---

## 🚨 Troubleshooting

### **Services Not Starting**
```bash
# Check Docker containers
docker-compose -f docker-compose.local.yml ps

# Restart specific service
docker-compose -f docker-compose.local.yml restart [service-name]

# View logs
docker-compose -f docker-compose.local.yml logs [service-name]
```

### **Frontend/Backend Issues**
```bash
# Check logs
tail -f logs/frontend.log
tail -f logs/backend.log

# Restart services
pkill -f "uvicorn\|npm"
./start-local-dev.sh
```

### **Database Connection Issues**
```bash
# Test PostgreSQL connection
docker exec -it opssight-postgres-local psql -U opssight -d opssight_dev -c "SELECT version();"

# Test Redis connection  
docker exec -it opssight-redis-local redis-cli ping
```

---

## 🎯 Next Steps

### **1. Explore the UI** (Start Here!)
1. Open http://localhost:3000
2. Create a user account or use demo credentials
3. Explore the main dashboard
4. Try creating a project
5. Check monitoring views

### **2. Test API Functionality**
1. Open http://localhost:8000/docs
2. Try authentication endpoints
3. Test project creation APIs
4. Explore monitoring endpoints

### **3. Monitor System Health**
1. Check Grafana dashboards at http://localhost:3001
2. Explore Prometheus metrics at http://localhost:9090
3. Set up custom alerts
4. Monitor resource usage

### **4. Full DevOps Integration**
1. Add more services from docker-compose.local.yml
2. Configure Jenkins pipelines
3. Set up Vault for secrets management
4. Integrate with external systems

---

## 📞 Quick Commands Summary

```bash
# Start everything
./start-local-dev.sh

# Test all services
node test-services.js

# Access main services
open http://localhost:3000    # Frontend
open http://localhost:8000/docs  # API Docs
open http://localhost:3001    # Grafana
open http://localhost:9090    # Prometheus

# Stop everything
pkill -f "uvicorn\|npm"
docker-compose -f docker-compose.local.yml down
```

🎉 **You're all set!** Start with the frontend at http://localhost:3000 and explore the comprehensive DevOps platform!