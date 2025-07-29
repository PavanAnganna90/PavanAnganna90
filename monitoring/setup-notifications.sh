#!/bin/bash

# OpsSight AlertManager Notification Setup Script
# This script helps you quickly configure Slack and Email notifications

set -e

echo "🚀 OpsSight AlertManager Notification Setup"
echo "==========================================="
echo ""

# Check if AlertManager is running
if ! curl -s http://localhost:9093/-/healthy > /dev/null; then
    echo "❌ AlertManager is not running or not healthy"
    echo "   Please start it with: docker compose up -d alertmanager"
    exit 1
fi

echo "✅ AlertManager is running"
echo ""

# Function to get user input
get_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        if [ -z "$value" ]; then
            value="$default"
        fi
    else
        read -p "$prompt: " value
    fi
    
    eval "$var_name='$value'"
}

# Function to get password input
get_password() {
    local prompt="$1"
    local var_name="$2"
    
    read -s -p "$prompt: " value
    echo ""
    eval "$var_name='$value'"
}

echo "📱 Slack Configuration"
echo "====================="
echo ""
echo "First, create a Slack webhook:"
echo "1. Go to https://api.slack.com/apps"
echo "2. Create a new app → 'From scratch'"
echo "3. Enable 'Incoming Webhooks'"
echo "4. Add webhook to your workspace"
echo "5. Copy the webhook URL"
echo ""

get_input "Enter your Slack webhook URL" "" "SLACK_WEBHOOK"
get_input "Enter Slack channel for general alerts" "#alerts" "SLACK_GENERAL_CHANNEL"
get_input "Enter Slack channel for critical alerts" "#critical-alerts" "SLACK_CRITICAL_CHANNEL"
get_input "Enter Slack channel for database alerts" "#database-alerts" "SLACK_DATABASE_CHANNEL"

echo ""
echo "📧 Email Configuration"
echo "====================="
echo ""
echo "Configure SMTP settings (Gmail example):"
echo ""

get_input "SMTP server" "smtp.gmail.com:587" "SMTP_SERVER"
get_input "From email address" "" "FROM_EMAIL"
get_input "SMTP username (usually same as from email)" "$FROM_EMAIL" "SMTP_USERNAME"
get_password "SMTP password (use app password for Gmail)" "SMTP_PASSWORD"
echo ""
get_input "DevOps on-call email" "devops-oncall@yourdomain.com" "ONCALL_EMAIL"
get_input "Database team email" "database-team@yourdomain.com" "DATABASE_EMAIL"
get_input "Infrastructure team email" "infrastructure@yourdomain.com" "INFRASTRUCTURE_EMAIL"

echo ""
echo "🔧 Generating Configuration..."

# Create the configuration file
cat > monitoring/alertmanager/config.yml << EOF
# OpsSight AlertManager Configuration
# Generated on $(date)

global:
  resolve_timeout: 5m
  slack_api_url: '$SLACK_WEBHOOK'
  smtp_smarthost: '$SMTP_SERVER'
  smtp_from: '$FROM_EMAIL'
  smtp_auth_username: '$SMTP_USERNAME'
  smtp_auth_password: '$SMTP_PASSWORD'
  smtp_require_tls: true

route:
  receiver: 'default-notifications'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
      repeat_interval: 1h
      
    - match:
        severity: warning
      receiver: 'warning-alerts'
      repeat_interval: 8h
      
    - match_re:
        service: ^(postgres|redis|database)$
      receiver: 'database-team'
      group_by: ['alertname', 'instance']
      
    - match_re:
        service: ^(node-exporter|prometheus|grafana)$
      receiver: 'infrastructure-team'

receivers:
  - name: 'default-notifications'
    slack_configs:
      - channel: '$SLACK_GENERAL_CHANNEL'
        title: '🚨 OpsSight Alert'
        text: |
          *Alert:* {{ .GroupLabels.alertname }}
          *Severity:* {{ .CommonLabels.severity }}
          *Summary:* {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}
          *Description:* {{ range .Alerts }}{{ .Annotations.description }}{{ end }}
        send_resolved: true
        footer: 'OpsSight Monitoring System'
        
  - name: 'critical-alerts'
    slack_configs:
      - channel: '$SLACK_CRITICAL_CHANNEL'
        title: '🔥 CRITICAL ALERT'
        text: |
          *CRITICAL ISSUE DETECTED*
          *Alert:* {{ .GroupLabels.alertname }}
          *Instance:* {{ .CommonLabels.instance }}
          *Summary:* {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}
          *Time:* {{ range .Alerts }}{{ .StartsAt.Format "2006-01-02 15:04:05" }}{{ end }}
        send_resolved: true
        color: 'danger'
    
    email_configs:
      - to: '$ONCALL_EMAIL'
        subject: '🔥 CRITICAL: {{ .GroupLabels.alertname }}'
        body: |
          Critical alert detected in OpsSight monitoring:
          
          Alert: {{ .GroupLabels.alertname }}
          Severity: {{ .CommonLabels.severity }}
          Instance: {{ .CommonLabels.instance }}
          
          {{ range .Alerts }}
          Summary: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Started: {{ .StartsAt.Format "2006-01-02 15:04:05" }}
          {{ end }}
          
          View in Grafana: http://localhost:3001
          View in Prometheus: http://localhost:9090
        
  - name: 'warning-alerts'
    slack_configs:
      - channel: '$SLACK_GENERAL_CHANNEL'
        title: '⚠️ Warning Alert'
        text: |
          *Warning:* {{ .GroupLabels.alertname }}
          *Instance:* {{ .CommonLabels.instance }}
          *Summary:* {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}
        send_resolved: true
        color: 'warning'
        
  - name: 'database-team'
    email_configs:
      - to: '$DATABASE_EMAIL'
        subject: 'Database Alert: {{ .GroupLabels.alertname }}'
        body: |
          Database alert detected:
          
          Service: {{ .CommonLabels.service }}
          Alert: {{ .GroupLabels.alertname }}
          Instance: {{ .CommonLabels.instance }}
          
          {{ range .Alerts }}
          Summary: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    
    slack_configs:
      - channel: '$SLACK_DATABASE_CHANNEL'
        title: '💾 Database Alert'
        text: |
          *Database Issue:* {{ .GroupLabels.alertname }}
          *Service:* {{ .CommonLabels.service }}
          *Instance:* {{ .CommonLabels.instance }}
          {{ range .Alerts }}*Summary:* {{ .Annotations.summary }}{{ end }}
        
  - name: 'infrastructure-team'
    email_configs:
      - to: '$INFRASTRUCTURE_EMAIL'
        subject: 'Infrastructure Alert: {{ .GroupLabels.alertname }}'
        body: |
          Infrastructure alert from OpsSight:
          
          Service: {{ .CommonLabels.service }}
          Alert: {{ .GroupLabels.alertname }}
          Instance: {{ .CommonLabels.instance }}
          Severity: {{ .CommonLabels.severity }}
          
          {{ range .Alerts }}
          Summary: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Started: {{ .StartsAt.Format "2006-01-02 15:04:05" }}
          {{ end }}
          
          Monitoring Dashboard: http://localhost:3001

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF

echo "✅ Configuration file created: monitoring/alertmanager/config.yml"
echo ""

# Reload AlertManager configuration
echo "🔄 Reloading AlertManager configuration..."
if curl -X POST http://localhost:9093/-/reload; then
    echo "✅ AlertManager configuration reloaded successfully"
else
    echo "❌ Failed to reload AlertManager configuration"
    echo "   You may need to restart the container:"
    echo "   docker compose restart alertmanager"
fi

echo ""
echo "🧪 Testing Configuration"
echo "======================="
echo ""

# Test Slack notification
echo "Sending test Slack notification..."
curl -X POST http://localhost:9093/api/v1/alerts \
-H "Content-Type: application/json" \
-d '[{
  "labels": {
    "alertname": "TestSlackAlert",
    "severity": "warning",
    "instance": "localhost:9090"
  },
  "annotations": {
    "summary": "This is a test Slack alert from OpsSight setup",
    "description": "If you receive this, your Slack integration is working!"
  }
}]' > /dev/null

echo "✅ Test Slack alert sent"

# Test email notification
echo "Sending test email notification..."
curl -X POST http://localhost:9093/api/v1/alerts \
-H "Content-Type: application/json" \
-d '[{
  "labels": {
    "alertname": "TestEmailAlert",
    "severity": "critical",
    "instance": "localhost:9090"
  },
  "annotations": {
    "summary": "This is a test email alert from OpsSight setup",
    "description": "If you receive this, your email integration is working!"
  }
}]' > /dev/null

echo "✅ Test email alert sent"

echo ""
echo "🎉 Setup Complete!"
echo "================="
echo ""
echo "Your AlertManager is now configured with:"
echo "  📱 Slack notifications to: $SLACK_GENERAL_CHANNEL, $SLACK_CRITICAL_CHANNEL, $SLACK_DATABASE_CHANNEL"
echo "  📧 Email notifications to: $ONCALL_EMAIL, $DATABASE_EMAIL, $INFRASTRUCTURE_EMAIL"
echo ""
echo "Next steps:"
echo "  1. Check your Slack channels and email for test notifications"
echo "  2. View AlertManager UI: http://localhost:9093"
echo "  3. Check firing alerts in Prometheus: http://localhost:9090/alerts"
echo "  4. Create custom dashboards in Grafana: http://localhost:3001"
echo ""
echo "For troubleshooting, check the logs:"
echo "  docker logs devops-app-dev-cursor-alertmanager-1 -f"
echo ""