# AlertManager Notification Setup Guide

## 🚀 Quick Setup for Slack and Email Notifications

Your AlertManager is currently running with placeholder configurations. Here's how to set up real notifications:

## 📱 Slack Setup

### Step 1: Create Slack Webhook
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "OpsSight Alerts" and select your workspace
4. Go to "Incoming Webhooks" → Enable webhooks
5. Click "Add New Webhook to Workspace"
6. Select the channel (e.g., #alerts) and authorize
7. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

### Step 2: Update Configuration
Replace the `slack_api_url` in `/monitoring/alertmanager/working-config.yml` with your actual webhook URL.

## 📧 Email Setup (Gmail Example)

### Step 1: Generate App Password
1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account settings → Security → App passwords
3. Generate an app password for "Mail"
4. Copy the 16-character password

### Step 2: Update Email Configuration
In `/monitoring/alertmanager/working-config.yml`, update:
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'your-email@gmail.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-16-character-app-password'
```

## 🔄 Apply Configuration

### Method 1: Replace Current Config
```bash
# Backup current config
cp monitoring/alertmanager/config.yml monitoring/alertmanager/config.yml.backup

# Use the working configuration
cp monitoring/alertmanager/working-config.yml monitoring/alertmanager/config.yml

# Restart AlertManager
docker compose restart alertmanager
```

### Method 2: Hot Reload (Preferred)
```bash
# Copy working config to active config
cp monitoring/alertmanager/working-config.yml monitoring/alertmanager/config.yml

# Reload configuration without restart
curl -X POST http://localhost:9093/-/reload
```

## 📋 Available Notification Channels

After setup, you'll have these notification channels:

### 🔥 Critical Alerts
- **Channels**: Slack (#critical-alerts) + Email (devops-oncall@yourdomain.com)
- **Triggers**: severity=critical
- **Frequency**: Every 1 hour until resolved

### ⚠️ Warning Alerts  
- **Channels**: Slack (#monitoring)
- **Triggers**: severity=warning
- **Frequency**: Every 8 hours

### 💾 Database Alerts
- **Channels**: Email (database-team@yourdomain.com) + Slack (#database-alerts)
- **Triggers**: service=postgres|redis|database
- **Grouping**: By alertname and instance

### 🏗️ Infrastructure Alerts
- **Channels**: Email (infrastructure@yourdomain.com)
- **Triggers**: service=node-exporter|prometheus|grafana
- **Grouping**: By alertname and service

## 🧪 Testing Notifications

### Test Slack Integration
```bash
# Send test alert to Slack
curl -X POST http://localhost:9093/api/v1/alerts \
-H "Content-Type: application/json" \
-d '[{
  "labels": {
    "alertname": "TestAlert",
    "severity": "warning",
    "instance": "localhost:9090"
  },
  "annotations": {
    "summary": "This is a test alert",
    "description": "Testing Slack notification integration"
  }
}]'
```

### Test Email Integration
```bash
# Send test critical alert (triggers email)
curl -X POST http://localhost:9093/api/v1/alerts \
-H "Content-Type: application/json" \
-d '[{
  "labels": {
    "alertname": "TestCriticalAlert",
    "severity": "critical",
    "instance": "localhost:9090"
  },
  "annotations": {
    "summary": "This is a test critical alert",
    "description": "Testing email notification integration"
  }
}]'
```

## 🔧 Customization Examples

### Add Microsoft Teams
```yaml
- name: 'teams-notifications'
  webhook_configs:
    - url: 'https://outlook.office.com/webhook/YOUR_TEAMS_WEBHOOK'
      title: 'OpsSight Alert'
      text: |
        **Alert:** {{ .GroupLabels.alertname }}
        **Severity:** {{ .CommonLabels.severity }}
        **Summary:** {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}
```

### Add Discord
```yaml
- name: 'discord-notifications'
  discord_configs:
    - webhook_url: 'https://discord.com/api/webhooks/YOUR_DISCORD_WEBHOOK'
      title: 'OpsSight Alert'
      message: |
        🚨 **{{ .GroupLabels.alertname }}**
        Severity: {{ .CommonLabels.severity }}
        {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}
```

### Add PagerDuty
```yaml
- name: 'pagerduty-critical'
  pagerduty_configs:
    - routing_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
      description: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
      severity: 'critical'
      client: 'OpsSight Monitoring'
```

## 📊 View Active Configuration

After setup, you can verify your configuration:

1. **AlertManager UI**: http://localhost:9093
   - View active configuration
   - See firing alerts
   - Manage silences

2. **Status Check**:
   ```bash
   curl http://localhost:9093/api/v1/status
   ```

3. **Configuration Validation**:
   ```bash
   docker exec -it devops-app-dev-cursor-alertmanager-1 amtool config show
   ```

## 🛠️ Troubleshooting

### Common Issues

1. **Slack webhook not working**:
   - Verify webhook URL is correct
   - Check channel permissions
   - Test webhook directly with curl

2. **Email not sending**:
   - Verify SMTP settings
   - Check app password for Gmail
   - Ensure TLS is enabled

3. **Configuration errors**:
   - Check AlertManager logs: `docker logs devops-app-dev-cursor-alertmanager-1`
   - Validate YAML syntax
   - Use `amtool` for validation

### Logs and Debugging
```bash
# View AlertManager logs
docker logs devops-app-dev-cursor-alertmanager-1 -f

# Check configuration syntax
docker exec -it devops-app-dev-cursor-alertmanager-1 amtool config check

# Test notification delivery
docker exec -it devops-app-dev-cursor-alertmanager-1 amtool alert add alertname=test severity=warning
```

## 🎯 Next Steps

1. **Set up your Slack webhook and email credentials**
2. **Update the working-config.yml with your details**
3. **Apply the configuration using hot reload**
4. **Test notifications with the provided curl commands**
5. **Create custom alert rules in Prometheus**
6. **Set up additional notification channels as needed**

Your AlertManager will then be fully functional with multi-channel notifications! 🚀