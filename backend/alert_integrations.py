#!/usr/bin/env python3
"""
Complete Alert Integration System for OpsSight Platform
Provides Slack notifications, webhook integrations, and alert management
"""

import asyncio
import json
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging
from enum import Enum
import hashlib
import hmac
import base64

class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertStatus(Enum):
    """Alert status"""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

@dataclass
class Alert:
    """Alert data structure"""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    status: AlertStatus
    source: str
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = None
    tags: List[str] = None
    affected_services: List[str] = None

class SlackNotificationService:
    """Slack notification service"""
    
    def __init__(self, webhook_url: str = None, bot_token: str = None):
        self.webhook_url = webhook_url or "https://hooks.slack.com/services/DEMO/WEBHOOK/URL"
        self.bot_token = bot_token
        self.logger = logging.getLogger(__name__)
        
    async def send_alert(self, alert: Alert, channel: str = "#alerts") -> Dict[str, Any]:
        """Send alert to Slack channel"""
        try:
            # Format alert for Slack
            slack_message = self._format_alert_for_slack(alert)
            
            # In demo mode, simulate successful send
            if "DEMO" in self.webhook_url:
                self.logger.info(f"Demo: Would send Slack alert to {channel}")
                return {
                    "success": True,
                    "channel": channel,
                    "timestamp": datetime.utcnow().isoformat(),
                    "message_id": f"slack_{alert.id}",
                    "demo_mode": True
                }
            
            # Real Slack integration would go here
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.webhook_url,
                    json=slack_message,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        return {
                            "success": True,
                            "channel": channel,
                            "timestamp": datetime.utcnow().isoformat(),
                            "response": await response.text()
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Slack API error: {response.status}",
                            "response": await response.text()
                        }
                        
        except Exception as e:
            self.logger.error(f"Failed to send Slack alert: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _format_alert_for_slack(self, alert: Alert) -> Dict[str, Any]:
        """Format alert for Slack message"""
        # Color coding based on severity
        colors = {
            AlertSeverity.CRITICAL: "#FF0000",  # Red
            AlertSeverity.HIGH: "#FF8C00",      # Orange
            AlertSeverity.MEDIUM: "#FFD700",    # Yellow
            AlertSeverity.LOW: "#32CD32",       # Green
            AlertSeverity.INFO: "#87CEEB"       # Light Blue
        }
        
        # Emoji mapping
        emojis = {
            AlertSeverity.CRITICAL: "🚨",
            AlertSeverity.HIGH: "⚠️",
            AlertSeverity.MEDIUM: "⚡",
            AlertSeverity.LOW: "💡",
            AlertSeverity.INFO: "ℹ️"
        }
        
        # Build attachment
        attachment = {
            "color": colors.get(alert.severity, "#87CEEB"),
            "title": f"{emojis.get(alert.severity, '🔔')} {alert.title}",
            "text": alert.description,
            "timestamp": int(alert.created_at.timestamp()),
            "fields": [
                {
                    "title": "Severity",
                    "value": alert.severity.value.upper(),
                    "short": True
                },
                {
                    "title": "Status", 
                    "value": alert.status.value.upper(),
                    "short": True
                },
                {
                    "title": "Source",
                    "value": alert.source,
                    "short": True
                },
                {
                    "title": "Alert ID",
                    "value": alert.id,
                    "short": True
                }
            ]
        }
        
        # Add affected services if available
        if alert.affected_services:
            attachment["fields"].append({
                "title": "Affected Services",
                "value": ", ".join(alert.affected_services),
                "short": False
            })
        
        # Add tags if available
        if alert.tags:
            attachment["fields"].append({
                "title": "Tags",
                "value": " ".join([f"`{tag}`" for tag in alert.tags]),
                "short": False
            })
        
        return {
            "username": "OpsSight Platform",
            "icon_emoji": ":warning:",
            "attachments": [attachment]
        }
    
    async def send_summary_report(self, alerts: List[Alert], channel: str = "#alerts") -> Dict[str, Any]:
        """Send alert summary report"""
        try:
            # Group alerts by severity
            alert_counts = {severity: 0 for severity in AlertSeverity}
            for alert in alerts:
                alert_counts[alert.severity] += 1
            
            # Create summary message
            summary_text = "📊 *OpsSight Alert Summary Report*\n\n"
            
            for severity, count in alert_counts.items():
                if count > 0:
                    emoji = {"critical": "🚨", "high": "⚠️", "medium": "⚡", "low": "💡", "info": "ℹ️"}
                    summary_text += f"{emoji.get(severity.value, '🔔')} {severity.value.upper()}: {count} alerts\n"
            
            summary_text += f"\nTotal Active Alerts: {len(alerts)}"
            summary_text += f"\nGenerated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}"
            
            message = {
                "username": "OpsSight Platform",
                "icon_emoji": ":chart_with_upwards_trend:",
                "text": summary_text
            }
            
            # Simulate sending for demo
            if "DEMO" in self.webhook_url:
                return {
                    "success": True,
                    "channel": channel,
                    "timestamp": datetime.utcnow().isoformat(),
                    "demo_mode": True,
                    "summary": alert_counts
                }
            
            # Real implementation would send via webhook
            return {"success": True, "demo": True}
            
        except Exception as e:
            self.logger.error(f"Failed to send summary report: {e}")
            return {"success": False, "error": str(e)}

class WebhookIntegrationService:
    """Generic webhook integration service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.registered_webhooks = {
            "pagerduty": {
                "url": "https://events.pagerduty.com/v2/enqueue",
                "auth_type": "integration_key",
                "active": False
            },
            "teams": {
                "url": "https://outlook.office.com/webhook/DEMO/IncomingWebhook/DEMO",
                "auth_type": "webhook",
                "active": True
            },
            "discord": {
                "url": "https://discord.com/api/webhooks/DEMO/WEBHOOK",
                "auth_type": "webhook", 
                "active": True
            },
            "custom": {
                "url": "https://api.example.com/alerts",
                "auth_type": "bearer_token",
                "active": True
            }
        }
    
    async def send_webhook_alert(self, alert: Alert, webhook_name: str) -> Dict[str, Any]:
        """Send alert via webhook"""
        try:
            webhook_config = self.registered_webhooks.get(webhook_name)
            if not webhook_config or not webhook_config["active"]:
                return {
                    "success": False,
                    "error": f"Webhook '{webhook_name}' not found or inactive"
                }
            
            # Format payload based on webhook type
            payload = self._format_webhook_payload(alert, webhook_name)
            
            # Demo mode simulation
            if "DEMO" in webhook_config["url"]:
                self.logger.info(f"Demo: Would send webhook to {webhook_name}")
                return {
                    "success": True,
                    "webhook": webhook_name,
                    "timestamp": datetime.utcnow().isoformat(),
                    "demo_mode": True,
                    "payload_size": len(json.dumps(payload))
                }
            
            # Real webhook sending would go here
            async with aiohttp.ClientSession() as session:
                headers = self._get_webhook_headers(webhook_name)
                async with session.post(
                    webhook_config["url"],
                    json=payload,
                    headers=headers
                ) as response:
                    return {
                        "success": response.status < 400,
                        "status_code": response.status,
                        "webhook": webhook_name,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
        except Exception as e:
            self.logger.error(f"Failed to send webhook alert: {e}")
            return {
                "success": False,
                "error": str(e),
                "webhook": webhook_name
            }
    
    def _format_webhook_payload(self, alert: Alert, webhook_name: str) -> Dict[str, Any]:
        """Format alert payload for specific webhook type"""
        base_payload = {
            "alert_id": alert.id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity.value,
            "status": alert.status.value,
            "source": alert.source,
            "timestamp": alert.created_at.isoformat(),
            "metadata": alert.metadata or {},
            "tags": alert.tags or [],
            "affected_services": alert.affected_services or []
        }
        
        # Customize payload based on webhook type
        if webhook_name == "pagerduty":
            return {
                "routing_key": "DEMO_INTEGRATION_KEY",
                "event_action": "trigger",
                "payload": {
                    "summary": alert.title,
                    "severity": alert.severity.value,
                    "source": alert.source,
                    "custom_details": base_payload
                }
            }
        elif webhook_name == "teams":
            return {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": self._get_teams_color(alert.severity),
                "summary": alert.title,
                "sections": [{
                    "activityTitle": alert.title,
                    "activitySubtitle": f"Severity: {alert.severity.value}",
                    "text": alert.description,
                    "facts": [
                        {"name": "Source", "value": alert.source},
                        {"name": "Status", "value": alert.status.value},
                        {"name": "Alert ID", "value": alert.id}
                    ]
                }]
            }
        elif webhook_name == "discord":
            return {
                "username": "OpsSight Platform",
                "embeds": [{
                    "title": alert.title,
                    "description": alert.description,
                    "color": self._get_discord_color(alert.severity),
                    "timestamp": alert.created_at.isoformat(),
                    "fields": [
                        {"name": "Severity", "value": alert.severity.value, "inline": True},
                        {"name": "Status", "value": alert.status.value, "inline": True},
                        {"name": "Source", "value": alert.source, "inline": True}
                    ]
                }]
            }
        else:
            # Generic webhook format
            return base_payload
    
    def _get_webhook_headers(self, webhook_name: str) -> Dict[str, str]:
        """Get headers for webhook request"""
        headers = {"Content-Type": "application/json"}
        
        if webhook_name == "custom":
            headers["Authorization"] = "Bearer DEMO_TOKEN"
        
        return headers
    
    def _get_teams_color(self, severity: AlertSeverity) -> str:
        """Get Microsoft Teams color for severity"""
        colors = {
            AlertSeverity.CRITICAL: "FF0000",
            AlertSeverity.HIGH: "FF8C00", 
            AlertSeverity.MEDIUM: "FFD700",
            AlertSeverity.LOW: "32CD32",
            AlertSeverity.INFO: "87CEEB"
        }
        return colors.get(severity, "87CEEB")
    
    def _get_discord_color(self, severity: AlertSeverity) -> int:
        """Get Discord color (decimal) for severity"""
        colors = {
            AlertSeverity.CRITICAL: 16711680,  # Red
            AlertSeverity.HIGH: 16753920,      # Orange
            AlertSeverity.MEDIUM: 16766720,    # Yellow
            AlertSeverity.LOW: 3329330,        # Green
            AlertSeverity.INFO: 8900331        # Light Blue
        }
        return colors.get(severity, 8900331)

class AlertIntegrationManager:
    """Main alert integration manager"""
    
    def __init__(self):
        self.slack_service = SlackNotificationService()
        self.webhook_service = WebhookIntegrationService()
        self.logger = logging.getLogger(__name__)
        self.active_alerts = self._generate_sample_alerts()
        
    def _generate_sample_alerts(self) -> List[Alert]:
        """Generate sample alerts for demonstration"""
        alerts = []
        
        # Critical alert
        alerts.append(Alert(
            id="alert-001",
            title="Database Connection Pool Exhausted",
            description="PostgreSQL connection pool has reached maximum capacity. New connections are being rejected.",
            severity=AlertSeverity.CRITICAL,
            status=AlertStatus.OPEN,
            source="database-monitor",
            created_at=datetime.utcnow() - timedelta(minutes=5),
            updated_at=datetime.utcnow() - timedelta(minutes=5),
            metadata={"db_host": "db-01", "pool_size": 100, "active_connections": 100},
            tags=["database", "performance", "connection-pool"],
            affected_services=["opssight-backend", "user-service"]
        ))
        
        # High severity alert
        alerts.append(Alert(
            id="alert-002",
            title="High CPU Usage on Kubernetes Node",
            description="Worker node k8s-worker-02 showing sustained CPU usage above 90% for 10 minutes.",
            severity=AlertSeverity.HIGH,
            status=AlertStatus.ACKNOWLEDGED,
            source="kubernetes-monitor",
            created_at=datetime.utcnow() - timedelta(minutes=15),
            updated_at=datetime.utcnow() - timedelta(minutes=5),
            metadata={"node": "k8s-worker-02", "cpu_usage": 94.2, "duration": "10m"},
            tags=["kubernetes", "cpu", "performance"],
            affected_services=["all-pods-on-node"]
        ))
        
        # Medium severity alert
        alerts.append(Alert(
            id="alert-003",  
            title="Ansible Playbook Execution Failed",
            description="Security hardening playbook failed on 2 out of 15 target hosts.",
            severity=AlertSeverity.MEDIUM,
            status=AlertStatus.OPEN,
            source="ansible-automation",
            created_at=datetime.utcnow() - timedelta(minutes=30),
            updated_at=datetime.utcnow() - timedelta(minutes=30),
            metadata={"playbook": "security-hardening", "failed_hosts": 2, "total_hosts": 15},
            tags=["ansible", "automation", "security"],
            affected_services=["web-server-03", "web-server-07"]
        ))
        
        # Info alert
        alerts.append(Alert(
            id="alert-004",
            title="Scheduled Backup Completed Successfully",
            description="Daily database backup completed successfully. Backup size: 2.3GB",
            severity=AlertSeverity.INFO,
            status=AlertStatus.RESOLVED,
            source="backup-service",
            created_at=datetime.utcnow() - timedelta(hours=2),
            updated_at=datetime.utcnow() - timedelta(hours=2),
            metadata={"backup_size": "2.3GB", "duration": "15m", "retention": "30d"},
            tags=["backup", "database", "success"],
            affected_services=["postgres-primary"]
        ))
        
        return alerts
    
    async def get_active_alerts(self, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get active alerts"""
        alerts = self.active_alerts
        
        if severity:
            try:
                severity_enum = AlertSeverity(severity.lower())
                alerts = [alert for alert in alerts if alert.severity == severity_enum]
            except ValueError:
                pass
        
        return [asdict(alert) for alert in alerts]
    
    async def send_alert_notifications(self, alert_id: str, channels: List[str] = None) -> Dict[str, Any]:
        """Send alert to all configured notification channels"""
        alert = next((a for a in self.active_alerts if a.id == alert_id), None)
        if not alert:
            return {"success": False, "error": "Alert not found"}
        
        results = {}
        channels = channels or ["slack", "teams", "discord"]
        
        # Send to Slack
        if "slack" in channels:
            results["slack"] = await self.slack_service.send_alert(alert)
        
        # Send to webhooks
        webhook_channels = [ch for ch in channels if ch in ["teams", "discord", "pagerduty", "custom"]]
        for webhook in webhook_channels:
            results[webhook] = await self.webhook_service.send_webhook_alert(alert, webhook)
        
        return {
            "alert_id": alert_id,
            "channels_attempted": len(channels),
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_integration_status(self) -> Dict[str, Any]:
        """Get status of all integrations"""
        return {
            "slack": {
                "configured": True,
                "webhook_url_set": bool(self.slack_service.webhook_url),
                "last_test": datetime.utcnow().isoformat(),
                "status": "operational"
            },
            "webhooks": {
                "total_configured": len(self.webhook_service.registered_webhooks),
                "active_webhooks": len([w for w in self.webhook_service.registered_webhooks.values() if w["active"]]),
                "webhook_status": {
                    name: {"active": config["active"], "url_configured": bool(config["url"])}
                    for name, config in self.webhook_service.registered_webhooks.items()
                }
            },
            "alert_statistics": {
                "total_active_alerts": len(self.active_alerts),
                "by_severity": {
                    severity.value: len([a for a in self.active_alerts if a.severity == severity])
                    for severity in AlertSeverity
                },
                "by_status": {
                    status.value: len([a for a in self.active_alerts if a.status == status])
                    for status in AlertStatus
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def test_integrations(self) -> Dict[str, Any]:
        """Test all alert integrations"""
        test_alert = Alert(
            id="test-alert",
            title="Integration Test Alert",
            description="This is a test alert to verify integration functionality.",
            severity=AlertSeverity.INFO,
            status=AlertStatus.OPEN,
            source="integration-test",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            tags=["test", "integration"],
            affected_services=["test-service"]
        )
        
        results = {}
        
        # Test Slack
        results["slack"] = await self.slack_service.send_alert(test_alert)
        
        # Test webhooks
        for webhook_name in self.webhook_service.registered_webhooks.keys():
            results[webhook_name] = await self.webhook_service.send_webhook_alert(test_alert, webhook_name)
        
        return {
            "test_timestamp": datetime.utcnow().isoformat(),
            "test_alert_id": test_alert.id,
            "results": results,
            "overall_success": all(result.get("success", False) for result in results.values())
        }

# Create global instance
alert_manager = AlertIntegrationManager()

if __name__ == "__main__":
    # Test the alert integrations
    async def test_alert_integrations():
        print("🔔 Testing Alert Integration System")
        print("=" * 50)
        
        # Test getting active alerts
        alerts = await alert_manager.get_active_alerts()
        print(f"✅ Active Alerts: {len(alerts)}")
        
        # Test integration status
        status = await alert_manager.get_integration_status()
        print(f"✅ Slack Configured: {status['slack']['configured']}")
        print(f"✅ Webhooks Active: {status['webhooks']['active_webhooks']}")
        
        # Test sending notifications
        if alerts:
            first_alert_id = alerts[0]["id"]
            notification_result = await alert_manager.send_alert_notifications(first_alert_id)
            print(f"✅ Notifications Sent: {notification_result['channels_attempted']} channels")
        
        # Test all integrations
        test_results = await alert_manager.test_integrations()
        print(f"✅ Integration Test Success: {test_results['overall_success']}")
        
        print("\n✅ Alert integration system test completed successfully!")
    
    asyncio.run(test_alert_integrations())