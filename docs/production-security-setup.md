# Production Security Setup Guide

## Overview
This guide provides step-by-step instructions for configuring the OpsSight platform for production deployment with proper security measures.

## 🔐 Authentication & Authorization

### 1. JWT Configuration
```bash
# Generate secure JWT secrets (256-bit minimum)
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
```

### 2. OAuth Provider Setup

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App with:
   - Homepage URL: `https://yourdomain.com`
   - Authorization callback URL: `https://yourdomain.com/auth/callback`
3. Set environment variables:
   ```bash
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

#### Google OAuth
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs: `https://yourdomain.com/auth/callback`
4. Set environment variables:
   ```bash
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

#### Microsoft Azure OAuth
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Create new registration
3. Add redirect URI: `https://yourdomain.com/auth/callback`
4. Set environment variables:
   ```bash
   AZURE_CLIENT_ID=your_azure_client_id
   AZURE_CLIENT_SECRET=your_azure_client_secret
   AZURE_TENANT_ID=your_azure_tenant_id
   ```

## 🛡️ Security Hardening

### 1. Password Policy
```bash
PASSWORD_MIN_LENGTH=10
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true
BCRYPT_ROUNDS=12
```

### 2. Rate Limiting
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=1800
```

### 3. Multi-Factor Authentication
```bash
MFA_ENABLED=true
MFA_ISSUER=OpsSight
```

### 4. Session Management
```bash
SESSION_TIMEOUT=3600
JWT_EXPIRE_MINUTES=60
```

## 🌐 CORS Configuration

### Production CORS Settings
```bash
CORS_ORIGINS=["https://yourdomain.com","https://app.yourdomain.com"]
```

### Development CORS Settings
```bash
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

## 🔒 SSL/TLS Configuration

### 1. SSL Certificate Setup
```bash
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem
FORCE_HTTPS=true
```

### 2. Generate Self-Signed Certificate (Development)
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### 3. Let's Encrypt (Production)
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificate files will be in:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

## 🗄️ Database Security

### 1. PostgreSQL Configuration
```bash
# Use strong passwords
DATABASE_URL=postgresql://username:secure_password@host:5432/database

# Enable SSL connection
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require
```

### 2. Redis Configuration
```bash
REDIS_URL=redis://username:password@host:6379/0
REDIS_PASSWORD=secure_redis_password
```

## 🔍 Monitoring & Logging

### 1. Security Monitoring
```bash
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=INFO
ENABLE_REQUEST_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
```

### 2. Prometheus Security
```bash
PROMETHEUS_URL=http://prometheus:9090
PROMETHEUS_TIMEOUT=30.0
# Add basic auth if needed
PROMETHEUS_USERNAME=monitoring_user
PROMETHEUS_PASSWORD=secure_monitoring_password
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Generate secure JWT secrets
- [ ] Configure OAuth providers
- [ ] Set up SSL certificates
- [ ] Configure database with secure credentials
- [ ] Set up monitoring and logging
- [ ] Configure CORS for production domains
- [ ] Enable rate limiting
- [ ] Set up MFA (if required)

### Post-Deployment
- [ ] Test OAuth flows
- [ ] Verify SSL/TLS configuration
- [ ] Test rate limiting
- [ ] Verify logging and monitoring
- [ ] Test security headers
- [ ] Run security scan
- [ ] Test backup and recovery

## 🔐 Security Headers

The application automatically sets these security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy: ...`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 🛠️ Security Testing

### 1. Test OAuth Flows
```bash
# Test GitHub OAuth
curl -X GET "https://yourdomain.com/auth/github"

# Test callback
curl -X GET "https://yourdomain.com/auth/callback?code=test_code"
```

### 2. Test Rate Limiting
```bash
# Test rate limiting
for i in {1..150}; do curl -X GET "https://yourdomain.com/api/health"; done
```

### 3. Test Security Headers
```bash
curl -I https://yourdomain.com
```

## 📋 Environment Variables Checklist

Copy `.env.production` template and update:
- [ ] `SECRET_KEY` - 256-bit secure key
- [ ] `JWT_SECRET` - JWT signing secret
- [ ] `DATABASE_URL` - Production database URL
- [ ] `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- [ ] `GITHUB_CLIENT_SECRET` - GitHub OAuth secret
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- [ ] `CORS_ORIGINS` - Production domain origins
- [ ] `SLACK_BOT_TOKEN` - Slack integration token
- [ ] `SENTRY_DSN` - Error tracking DSN
- [ ] `SMTP_*` - Email service configuration

## 🚨 Security Alerts

Monitor for:
- Failed login attempts
- Rate limit violations
- JWT token anomalies
- Database connection errors
- SSL certificate expiration
- OAuth provider failures

## 📞 Support

For security issues or questions:
- Create an issue in the repository
- Contact the security team
- Review security documentation
- Check monitoring dashboards

---

**⚠️ Important:** Never commit production secrets to version control. Use environment variables and secure secret management systems.