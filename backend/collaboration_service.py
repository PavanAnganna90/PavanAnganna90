#!/usr/bin/env python3
"""
Real-time Collaboration Service
Chat, notifications, and team collaboration features for OpsSight Platform
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set, Callable
from dataclasses import dataclass, asdict
import logging
import uuid
from enum import Enum
import weakref

class NotificationType(Enum):
    """Types of notifications"""
    ALERT = "alert"
    DEPLOYMENT = "deployment"
    SECURITY = "security"
    CHAT_MESSAGE = "chat_message"
    SYSTEM = "system"
    PIPELINE_UPDATE = "pipeline_update"
    COMPLIANCE = "compliance"

class ChatMessageType(Enum):
    """Types of chat messages"""
    TEXT = "text"
    SYSTEM = "system"
    FILE_SHARE = "file_share"
    ALERT_SHARE = "alert_share"
    CODE_SNIPPET = "code_snippet"

class UserStatus(Enum):
    """User online status"""
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"

@dataclass
class ChatMessage:
    """Chat message data structure"""
    id: str
    channel_id: str
    user_id: str
    username: str
    message_type: ChatMessageType
    content: str
    timestamp: datetime
    edited_at: Optional[datetime] = None
    reply_to: Optional[str] = None
    attachments: List[str] = None
    reactions: Dict[str, List[str]] = None  # emoji -> [user_ids]
    
    def __post_init__(self):
        if self.attachments is None:
            self.attachments = []
        if self.reactions is None:
            self.reactions = {}

@dataclass
class Notification:
    """Notification data structure"""
    id: str
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    data: Dict[str, Any]
    created_at: datetime
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None
    priority: str = "medium"  # low, medium, high, critical
    
@dataclass
class ChatChannel:
    """Chat channel data structure"""
    id: str
    name: str
    description: str
    channel_type: str  # general, alerts, deployments, security, team-specific
    created_by: str
    created_at: datetime
    members: Set[str]
    is_private: bool = False
    last_activity: Optional[datetime] = None

@dataclass
class UserSession:
    """User session tracking"""
    user_id: str
    username: str
    status: UserStatus
    last_seen: datetime
    current_channels: Set[str]
    websocket_connections: Set[str]  # connection IDs
    
    def __post_init__(self):
        if self.current_channels is None:
            self.current_channels = set()
        if self.websocket_connections is None:
            self.websocket_connections = set()

class CollaborationService:
    """Real-time collaboration service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # In-memory storage (would be database/Redis in production)
        self.chat_messages: Dict[str, List[ChatMessage]] = {}  # channel_id -> messages
        self.notifications: Dict[str, List[Notification]] = {}  # user_id -> notifications
        self.channels: Dict[str, ChatChannel] = {}
        self.user_sessions: Dict[str, UserSession] = {}
        self.websocket_connections: Dict[str, Callable] = {}  # connection_id -> callback
        
        # Initialize default channels and demo data
        self._initialize_default_channels()
        self._generate_demo_data()
        
    def _initialize_default_channels(self):
        """Initialize default chat channels"""
        default_channels = [
            {
                "id": "general",
                "name": "General",
                "description": "General team discussions",
                "channel_type": "general",
                "is_private": False
            },
            {
                "id": "alerts",
                "name": "Alerts & Incidents",
                "description": "Security alerts and incident response",
                "channel_type": "alerts",
                "is_private": False
            },
            {
                "id": "deployments",
                "name": "Deployments",
                "description": "Deployment notifications and updates",
                "channel_type": "deployments",
                "is_private": False
            },
            {
                "id": "security",
                "name": "Security Team",
                "description": "Security team discussions",
                "channel_type": "security",
                "is_private": True
            },
            {
                "id": "devops",
                "name": "DevOps Team",
                "description": "DevOps and infrastructure discussions",
                "channel_type": "team-specific",
                "is_private": False
            }
        ]
        
        for channel_data in default_channels:
            channel = ChatChannel(
                id=channel_data["id"],
                name=channel_data["name"],
                description=channel_data["description"],
                channel_type=channel_data["channel_type"],
                created_by="system",
                created_at=datetime.utcnow() - timedelta(days=30),
                members=set(["demo123", "sarah_chen", "mike_johnson", "alex_kumar"]),
                is_private=channel_data["is_private"],
                last_activity=datetime.utcnow() - timedelta(hours=2)
            )
            self.channels[channel.id] = channel
            self.chat_messages[channel.id] = []
    
    def _generate_demo_data(self):
        """Generate demo chat messages and notifications"""
        # Demo users
        demo_users = [
            ("demo123", "Demo User"),
            ("sarah_chen", "Sarah Chen"),
            ("mike_johnson", "Mike Johnson"),
            ("alex_kumar", "Alex Kumar"),
            ("emily_davis", "Emily Davis")
        ]
        
        # Create user sessions
        for user_id, username in demo_users:
            self.user_sessions[user_id] = UserSession(
                user_id=user_id,
                username=username,
                status=UserStatus.ONLINE if user_id == "demo123" else UserStatus.AWAY,
                last_seen=datetime.utcnow() - timedelta(minutes=random_minutes()),
                current_channels=set(["general", "deployments"]),
                websocket_connections=set()
            )
        
        # Generate demo messages
        demo_messages = [
            ("general", "sarah_chen", "Good morning team! Ready for today's deployment?", ChatMessageType.TEXT),
            ("general", "mike_johnson", "Yes, all systems looking good. Pipeline is green ✅", ChatMessageType.TEXT),
            ("alerts", "system", "🚨 Critical vulnerability detected in opssight-backend", ChatMessageType.SYSTEM),
            ("alerts", "alex_kumar", "On it! Checking the security dashboard now", ChatMessageType.TEXT),
            ("deployments", "system", "🚀 Deployment to production started - Build #1234", ChatMessageType.SYSTEM),
            ("deployments", "emily_davis", "Monitoring the rollout, all metrics stable", ChatMessageType.TEXT),
            ("security", "alex_kumar", "CVE-2024-1234 needs immediate attention", ChatMessageType.TEXT),
            ("devops", "mike_johnson", "Infrastructure scaling completed successfully", ChatMessageType.TEXT)
        ]
        
        for channel_id, user_id, content, msg_type in demo_messages:
            username = next((u[1] for u in demo_users if u[0] == user_id), user_id)
            message = ChatMessage(
                id=str(uuid.uuid4()),
                channel_id=channel_id,
                user_id=user_id,
                username=username,
                message_type=msg_type,
                content=content,
                timestamp=datetime.utcnow() - timedelta(minutes=random_minutes()),
                reactions={"👍": ["demo123"], "🚀": ["sarah_chen"]} if channel_id == "deployments" else {}
            )
            self.chat_messages[channel_id].append(message)
        
        # Generate demo notifications
        demo_notifications = [
            ("demo123", NotificationType.SECURITY, "Critical Vulnerability", "SQL injection vulnerability found in authentication system", {"cve": "CVE-2024-1234"}),
            ("demo123", NotificationType.DEPLOYMENT, "Deployment Complete", "opssight-frontend v2.2.0 deployed successfully", {"environment": "production"}),
            ("demo123", NotificationType.ALERT, "High CPU Usage", "Production servers experiencing 85% CPU utilization", {"threshold": "80%"}),
            ("demo123", NotificationType.PIPELINE_UPDATE, "Pipeline Failed", "Build #1235 failed in test stage", {"pipeline_id": "pipeline_235"}),
            ("demo123", NotificationType.COMPLIANCE, "Compliance Review", "SOC2 compliance review due in 7 days", {"framework": "SOC2"})
        ]
        
        for user_id, notif_type, title, message, data in demo_notifications:
            notification = Notification(
                id=str(uuid.uuid4()),
                user_id=user_id,
                notification_type=notif_type,
                title=title,
                message=message,
                data=data,
                created_at=datetime.utcnow() - timedelta(hours=random_hours()),
                priority="critical" if notif_type == NotificationType.SECURITY else "medium"
            )
            if user_id not in self.notifications:
                self.notifications[user_id] = []
            self.notifications[user_id].append(notification)
    
    async def get_user_channels(self, user_id: str) -> List[Dict[str, Any]]:
        """Get channels accessible to user"""
        user_channels = []
        
        for channel in self.channels.values():
            # Check if user has access
            if not channel.is_private or user_id in channel.members:
                # Get unread message count
                user_session = self.user_sessions.get(user_id)
                last_read = user_session.last_seen if user_session else datetime.utcnow()
                unread_count = len([
                    msg for msg in self.chat_messages.get(channel.id, [])
                    if msg.timestamp > last_read and msg.user_id != user_id
                ])
                
                user_channels.append({
                    "id": channel.id,
                    "name": channel.name,
                    "description": channel.description,
                    "channel_type": channel.channel_type,
                    "is_private": channel.is_private,
                    "member_count": len(channel.members),
                    "unread_count": unread_count,
                    "last_activity": channel.last_activity.isoformat() if channel.last_activity else None
                })
        
        return sorted(user_channels, key=lambda x: x["last_activity"] or "", reverse=True)
    
    async def get_channel_messages(self, channel_id: str, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent messages for a channel"""
        # Check if user has access to channel
        channel = self.channels.get(channel_id)
        if not channel or (channel.is_private and user_id not in channel.members):
            raise ValueError("Channel not found or access denied")
        
        messages = self.chat_messages.get(channel_id, [])
        recent_messages = sorted(messages, key=lambda x: x.timestamp, reverse=True)[:limit]
        
        return [
            {
                "id": msg.id,
                "user_id": msg.user_id,
                "username": msg.username,
                "message_type": msg.message_type.value,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
                "reply_to": msg.reply_to,
                "attachments": msg.attachments,
                "reactions": msg.reactions
            }
            for msg in reversed(recent_messages)
        ]
    
    async def send_message(self, channel_id: str, user_id: str, content: str, 
                          message_type: ChatMessageType = ChatMessageType.TEXT,
                          reply_to: Optional[str] = None) -> Dict[str, Any]:
        """Send a chat message"""
        # Validate channel access
        channel = self.channels.get(channel_id)
        if not channel or (channel.is_private and user_id not in channel.members):
            raise ValueError("Channel not found or access denied")
        
        # Get username
        user_session = self.user_sessions.get(user_id)
        username = user_session.username if user_session else user_id
        
        # Create message
        message = ChatMessage(
            id=str(uuid.uuid4()),
            channel_id=channel_id,
            user_id=user_id,
            username=username,
            message_type=message_type,
            content=content,
            timestamp=datetime.utcnow(),
            reply_to=reply_to
        )
        
        # Store message
        if channel_id not in self.chat_messages:
            self.chat_messages[channel_id] = []
        self.chat_messages[channel_id].append(message)
        
        # Update channel activity
        channel.last_activity = message.timestamp
        
        # Broadcast to channel members (WebSocket would handle this in production)
        await self._broadcast_message(channel_id, message)
        
        return {
            "id": message.id,
            "user_id": message.user_id,
            "username": message.username,
            "message_type": message.message_type.value,
            "content": message.content,
            "timestamp": message.timestamp.isoformat(),
            "channel_id": channel_id
        }
    
    async def get_user_notifications(self, user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Get user notifications"""
        user_notifications = self.notifications.get(user_id, [])
        
        if unread_only:
            user_notifications = [n for n in user_notifications if n.read_at is None]
        
        # Sort by creation time, newest first
        user_notifications.sort(key=lambda x: x.created_at, reverse=True)
        
        return [
            {
                "id": notif.id,
                "notification_type": notif.notification_type.value,
                "title": notif.title,
                "message": notif.message,
                "data": notif.data,
                "created_at": notif.created_at.isoformat(),
                "read_at": notif.read_at.isoformat() if notif.read_at else None,
                "action_url": notif.action_url,
                "priority": notif.priority
            }
            for notif in user_notifications[:20]  # Return last 20 notifications
        ]
    
    async def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read"""
        user_notifications = self.notifications.get(user_id, [])
        
        for notification in user_notifications:
            if notification.id == notification_id:
                notification.read_at = datetime.utcnow()
                return True
        
        return False
    
    async def create_notification(self, user_id: str, notification_type: NotificationType,
                                title: str, message: str, data: Dict[str, Any] = None,
                                priority: str = "medium", action_url: str = None) -> str:
        """Create a new notification"""
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {},
            created_at=datetime.utcnow(),
            priority=priority,
            action_url=action_url
        )
        
        if user_id not in self.notifications:
            self.notifications[user_id] = []
        
        self.notifications[user_id].append(notification)
        
        # Broadcast notification via WebSocket (in production)
        await self._broadcast_notification(user_id, notification)
        
        return notification.id
    
    async def get_online_users(self) -> List[Dict[str, Any]]:
        """Get list of online users"""
        online_users = []
        
        for user_session in self.user_sessions.values():
            if user_session.status in [UserStatus.ONLINE, UserStatus.AWAY, UserStatus.BUSY]:
                online_users.append({
                    "user_id": user_session.user_id,
                    "username": user_session.username,
                    "status": user_session.status.value,
                    "last_seen": user_session.last_seen.isoformat(),
                    "current_channels": list(user_session.current_channels)
                })
        
        return sorted(online_users, key=lambda x: x["username"])
    
    async def update_user_status(self, user_id: str, status: UserStatus) -> bool:
        """Update user online status"""
        if user_id in self.user_sessions:
            self.user_sessions[user_id].status = status
            self.user_sessions[user_id].last_seen = datetime.utcnow()
            
            # Broadcast status change
            await self._broadcast_status_change(user_id, status)
            return True
        
        return False
    
    async def add_reaction(self, message_id: str, user_id: str, emoji: str, channel_id: str) -> bool:
        """Add emoji reaction to message"""
        messages = self.chat_messages.get(channel_id, [])
        
        for message in messages:
            if message.id == message_id:
                if emoji not in message.reactions:
                    message.reactions[emoji] = []
                
                if user_id not in message.reactions[emoji]:
                    message.reactions[emoji].append(user_id)
                    
                    # Broadcast reaction update
                    await self._broadcast_reaction(channel_id, message_id, emoji, user_id, "add")
                    return True
        
        return False
    
    async def get_collaboration_stats(self) -> Dict[str, Any]:
        """Get collaboration statistics"""
        total_messages = sum(len(messages) for messages in self.chat_messages.values())
        total_channels = len(self.channels)
        online_users = len([s for s in self.user_sessions.values() if s.status == UserStatus.ONLINE])
        total_notifications = sum(len(notifications) for notifications in self.notifications.values())
        unread_notifications = sum(
            len([n for n in notifications if n.read_at is None])
            for notifications in self.notifications.values()
        )
        
        # Activity in last 24 hours
        last_24h = datetime.utcnow() - timedelta(hours=24)
        recent_messages = sum(
            len([msg for msg in messages if msg.timestamp > last_24h])
            for messages in self.chat_messages.values()
        )
        
        return {
            "total_messages": total_messages,
            "total_channels": total_channels,
            "online_users": online_users,
            "total_users": len(self.user_sessions),
            "total_notifications": total_notifications,
            "unread_notifications": unread_notifications,
            "messages_24h": recent_messages,
            "most_active_channel": max(
                self.channels.values(),
                key=lambda c: len(self.chat_messages.get(c.id, [])),
                default=None
            ).name if self.channels else None
        }
    
    # Private helper methods
    async def _broadcast_message(self, channel_id: str, message: ChatMessage):
        """Broadcast message to channel members (WebSocket simulation)"""
        # In production, this would send via WebSocket connections
        self.logger.info(f"Broadcasting message to channel {channel_id}: {message.content[:50]}...")
    
    async def _broadcast_notification(self, user_id: str, notification: Notification):
        """Broadcast notification to user (WebSocket simulation)"""
        self.logger.info(f"Broadcasting notification to {user_id}: {notification.title}")
    
    async def _broadcast_status_change(self, user_id: str, status: UserStatus):
        """Broadcast user status change (WebSocket simulation)"""
        self.logger.info(f"User {user_id} status changed to {status.value}")
    
    async def _broadcast_reaction(self, channel_id: str, message_id: str, emoji: str, user_id: str, action: str):
        """Broadcast reaction update (WebSocket simulation)"""
        self.logger.info(f"Reaction {action}: {emoji} by {user_id} on message {message_id}")

def random_minutes() -> int:
    """Generate random minutes for demo data"""
    import random
    return random.randint(1, 240)  # 1-240 minutes

def random_hours() -> int:
    """Generate random hours for demo data"""
    import random
    return random.randint(1, 72)  # 1-72 hours

# Create global instance
collaboration_service = CollaborationService()

if __name__ == "__main__":
    # Test collaboration service features
    async def test_collaboration_service():
        print("💬 Testing Collaboration Service")
        print("=" * 50)
        
        # Test user channels
        channels = await collaboration_service.get_user_channels("demo123")
        print(f"✅ User Channels:")
        print(f"   • Total Channels: {len(channels)}")
        print(f"   • Channel Types: {set(c['channel_type'] for c in channels)}")
        print()
        
        # Test messages
        messages = await collaboration_service.get_channel_messages("general", "demo123", limit=5)
        print(f"✅ Recent Messages (General):")
        print(f"   • Message Count: {len(messages)}")
        if messages:
            print(f"   • Latest: {messages[-1]['content'][:50]}...")
        print()
        
        # Test sending message
        new_message = await collaboration_service.send_message(
            "general", "demo123", "Hello from collaboration service test!"
        )
        print(f"✅ Message Sent:")
        print(f"   • Message ID: {new_message['id']}")
        print(f"   • Content: {new_message['content']}")
        print()
        
        # Test notifications
        notifications = await collaboration_service.get_user_notifications("demo123")
        print(f"✅ User Notifications:")
        print(f"   • Total Notifications: {len(notifications)}")
        print(f"   • Unread: {len([n for n in notifications if not n['read_at']])}")
        if notifications:
            print(f"   • Latest: {notifications[0]['title']}")
        print()
        
        # Test online users
        online_users = await collaboration_service.get_online_users()
        print(f"✅ Online Users:")
        print(f"   • Online Count: {len(online_users)}")
        for user in online_users[:3]:
            print(f"   • {user['username']}: {user['status']}")
        print()
        
        # Test collaboration stats
        stats = await collaboration_service.get_collaboration_stats()
        print(f"✅ Collaboration Statistics:")
        print(f"   • Total Messages: {stats['total_messages']}")
        print(f"   • Online Users: {stats['online_users']}/{stats['total_users']}")
        print(f"   • Most Active Channel: {stats['most_active_channel']}")
        print(f"   • Messages (24h): {stats['messages_24h']}")
        
        print("\n✅ Collaboration service test completed!")
    
    asyncio.run(test_collaboration_service())