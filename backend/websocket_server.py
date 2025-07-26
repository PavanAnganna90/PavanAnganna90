"""
OpsSight WebSocket Server - v2.0.0
Real-time bidirectional communication for live dashboard updates

Features:
- Real-time metrics streaming
- Alert notifications
- System status updates
- Collaborative features
- Performance monitoring
- Security events
- Cost optimization alerts
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Set, Any, Optional, List
import websockets
import jwt
from dataclasses import dataclass, asdict
from enum import Enum
import random
import hashlib
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MessageType(Enum):
    # System messages
    HEARTBEAT = "heartbeat"
    AUTHENTICATION = "authentication"
    SUBSCRIPTION = "subscription"
    ERROR = "error"
    
    # Dashboard updates
    METRICS_UPDATE = "metrics_update"
    SYSTEM_STATUS = "system_status"
    PERFORMANCE_DATA = "performance_data"
    COST_UPDATE = "cost_update"
    
    # Alerts and notifications
    ALERT_CRITICAL = "alert_critical"
    ALERT_WARNING = "alert_warning"
    ALERT_INFO = "alert_info"
    SECURITY_EVENT = "security_event"
    
    # Collaboration
    USER_ACTIVITY = "user_activity"
    CHAT_MESSAGE = "chat_message"
    NOTIFICATION = "notification"
    
    # Deployment events
    DEPLOYMENT_START = "deployment_start"
    DEPLOYMENT_SUCCESS = "deployment_success"
    DEPLOYMENT_FAILURE = "deployment_failure"
    PIPELINE_UPDATE = "pipeline_update"

class SubscriptionChannel(Enum):
    METRICS = "metrics"
    ALERTS = "alerts"
    SECURITY = "security"
    PERFORMANCE = "performance"
    COST_OPTIMIZATION = "cost_optimization"
    COLLABORATION = "collaboration"
    DEPLOYMENTS = "deployments"
    SYSTEM_OBSERVABILITY = "system_observability"
    ALL = "all"

@dataclass
class WebSocketMessage:
    type: str
    channel: str
    data: Dict[str, Any]
    timestamp: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    
    def to_json(self) -> str:
        return json.dumps(asdict(self))

@dataclass
class ConnectedClient:
    websocket: websockets.WebSocketServerProtocol
    user_id: str
    session_id: str
    subscriptions: Set[str]
    connected_at: datetime
    last_heartbeat: datetime
    metadata: Dict[str, Any]

class WebSocketManager:
    def __init__(self):
        self.clients: Dict[str, ConnectedClient] = {}
        self.channels: Dict[str, Set[str]] = {}
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.running = False
        self.jwt_secret = "opssight-websocket-secret-key"  # In production, use environment variable
        
        # Initialize channels
        for channel in SubscriptionChannel:
            self.channels[channel.value] = set()
    
    async def start_server(self, host: str = "localhost", port: int = 8765):
        """Start the WebSocket server"""
        logger.info(f"Starting WebSocket server on {host}:{port}")
        self.running = True
        
        # Start background tasks
        asyncio.create_task(self.heartbeat_monitor())
        asyncio.create_task(self.metrics_broadcaster())
        asyncio.create_task(self.alert_monitor())
        asyncio.create_task(self.performance_monitor())
        
        # Start WebSocket server
        async with websockets.serve(self.handle_client, host, port):
            logger.info("WebSocket server started successfully")
            await asyncio.Future()  # Run forever
    
    async def handle_client(self, websocket, path):
        """Handle new client connection"""
        session_id = str(uuid.uuid4())
        logger.info(f"New client connection: {session_id}")
        
        try:
            # Wait for authentication
            auth_message = await websocket.recv()
            auth_data = json.loads(auth_message)
            
            if not await self.authenticate_client(auth_data, websocket, session_id):
                await websocket.close(code=4001, reason="Authentication failed")
                return
            
            # Handle client messages
            async for message in websocket:
                await self.process_message(message, session_id)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {session_id} disconnected")
        except Exception as e:
            logger.error(f"Error handling client {session_id}: {e}")
        finally:
            await self.disconnect_client(session_id)
    
    async def authenticate_client(self, auth_data: dict, websocket, session_id: str) -> bool:
        """Authenticate client connection"""
        try:
            token = auth_data.get("token")
            if not token:
                await self.send_error(websocket, "Missing authentication token")
                return False
            
            # In production, verify JWT token
            # For demo, accept any token that looks valid
            if len(token) < 10:
                await self.send_error(websocket, "Invalid token format")
                return False
            
            # Create client record
            user_id = auth_data.get("user_id", "demo_user")
            subscriptions = set(auth_data.get("subscriptions", [SubscriptionChannel.ALL.value]))
            
            client = ConnectedClient(
                websocket=websocket,
                user_id=user_id,
                session_id=session_id,
                subscriptions=subscriptions,
                connected_at=datetime.utcnow(),
                last_heartbeat=datetime.utcnow(),
                metadata=auth_data.get("metadata", {})
            )
            
            self.clients[session_id] = client
            
            # Subscribe to channels
            for subscription in subscriptions:
                if subscription in self.channels:
                    self.channels[subscription].add(session_id)
            
            # Send authentication success
            await self.send_message(websocket, WebSocketMessage(
                type=MessageType.AUTHENTICATION.value,
                channel="system",
                data={
                    "status": "authenticated",
                    "session_id": session_id,
                    "user_id": user_id,
                    "subscriptions": list(subscriptions)
                },
                timestamp=datetime.utcnow().isoformat(),
                user_id=user_id,
                session_id=session_id
            ))
            
            logger.info(f"Client {session_id} authenticated as {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            await self.send_error(websocket, "Authentication failed")
            return False
    
    async def process_message(self, raw_message: str, session_id: str):
        """Process incoming message from client"""
        try:
            message_data = json.loads(raw_message)
            message_type = message_data.get("type")
            
            client = self.clients.get(session_id)
            if not client:
                return
            
            if message_type == MessageType.HEARTBEAT.value:
                await self.handle_heartbeat(client)
            elif message_type == MessageType.SUBSCRIPTION.value:
                await self.handle_subscription(client, message_data)
            elif message_type == MessageType.CHAT_MESSAGE.value:
                await self.handle_chat_message(client, message_data)
            elif message_type == MessageType.USER_ACTIVITY.value:
                await self.handle_user_activity(client, message_data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Error processing message from {session_id}: {e}")
    
    async def handle_heartbeat(self, client: ConnectedClient):
        """Handle heartbeat from client"""
        client.last_heartbeat = datetime.utcnow()
        await self.send_message(client.websocket, WebSocketMessage(
            type=MessageType.HEARTBEAT.value,
            channel="system",
            data={"status": "alive", "server_time": datetime.utcnow().isoformat()},
            timestamp=datetime.utcnow().isoformat(),
            session_id=client.session_id
        ))
    
    async def handle_subscription(self, client: ConnectedClient, message_data: dict):
        """Handle subscription changes"""
        action = message_data.get("action")  # "subscribe" or "unsubscribe"
        channels = message_data.get("channels", [])
        
        for channel in channels:
            if channel in self.channels:
                if action == "subscribe":
                    self.channels[channel].add(client.session_id)
                    client.subscriptions.add(channel)
                elif action == "unsubscribe":
                    self.channels[channel].discard(client.session_id)
                    client.subscriptions.discard(channel)
        
        await self.send_message(client.websocket, WebSocketMessage(
            type=MessageType.SUBSCRIPTION.value,
            channel="system",
            data={
                "action": action,
                "channels": channels,
                "current_subscriptions": list(client.subscriptions)
            },
            timestamp=datetime.utcnow().isoformat(),
            session_id=client.session_id
        ))
    
    async def handle_chat_message(self, client: ConnectedClient, message_data: dict):
        """Handle chat messages for collaboration"""
        channel_id = message_data.get("channel", "general")
        content = message_data.get("content", "")
        
        # Broadcast to collaboration channel subscribers
        message = WebSocketMessage(
            type=MessageType.CHAT_MESSAGE.value,
            channel=SubscriptionChannel.COLLABORATION.value,
            data={
                "channel_id": channel_id,
                "content": content,
                "username": client.metadata.get("username", client.user_id),
                "user_id": client.user_id,
                "message_id": str(uuid.uuid4())
            },
            timestamp=datetime.utcnow().isoformat(),
            user_id=client.user_id,
            session_id=client.session_id
        )
        
        await self.broadcast_to_channel(SubscriptionChannel.COLLABORATION.value, message)
    
    async def handle_user_activity(self, client: ConnectedClient, message_data: dict):
        """Handle user activity updates"""
        activity_type = message_data.get("activity_type")
        activity_data = message_data.get("data", {})
        
        message = WebSocketMessage(
            type=MessageType.USER_ACTIVITY.value,
            channel=SubscriptionChannel.COLLABORATION.value,
            data={
                "user_id": client.user_id,
                "username": client.metadata.get("username", client.user_id),
                "activity_type": activity_type,
                "activity_data": activity_data
            },
            timestamp=datetime.utcnow().isoformat(),
            user_id=client.user_id,
            session_id=client.session_id
        )
        
        await self.broadcast_to_channel(SubscriptionChannel.COLLABORATION.value, message)
    
    async def disconnect_client(self, session_id: str):
        """Handle client disconnection"""
        client = self.clients.get(session_id)
        if not client:
            return
        
        # Remove from all channels
        for channel_clients in self.channels.values():
            channel_clients.discard(session_id)
        
        # Remove client record
        del self.clients[session_id]
        
        logger.info(f"Client {session_id} disconnected")
    
    async def send_message(self, websocket, message: WebSocketMessage):
        """Send message to specific websocket"""
        try:
            await websocket.send(message.to_json())
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def send_error(self, websocket, error_message: str):
        """Send error message to client"""
        error_msg = WebSocketMessage(
            type=MessageType.ERROR.value,
            channel="system",
            data={"error": error_message},
            timestamp=datetime.utcnow().isoformat()
        )
        await self.send_message(websocket, error_msg)
    
    async def broadcast_to_channel(self, channel: str, message: WebSocketMessage):
        """Broadcast message to all subscribers of a channel"""
        if channel not in self.channels:
            return
        
        disconnected_clients = []
        
        for session_id in self.channels[channel]:
            client = self.clients.get(session_id)
            if not client:
                disconnected_clients.append(session_id)
                continue
            
            try:
                await self.send_message(client.websocket, message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.append(session_id)
            except Exception as e:
                logger.error(f"Error broadcasting to {session_id}: {e}")
        
        # Clean up disconnected clients
        for session_id in disconnected_clients:
            self.channels[channel].discard(session_id)
    
    async def heartbeat_monitor(self):
        """Monitor client heartbeats and remove stale connections"""
        while self.running:
            try:
                current_time = datetime.utcnow()
                stale_clients = []
                
                for session_id, client in self.clients.items():
                    time_since_heartbeat = current_time - client.last_heartbeat
                    if time_since_heartbeat > timedelta(minutes=5):  # 5 minute timeout
                        stale_clients.append(session_id)
                
                for session_id in stale_clients:
                    logger.info(f"Removing stale client: {session_id}")
                    await self.disconnect_client(session_id)
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Heartbeat monitor error: {e}")
                await asyncio.sleep(60)
    
    async def metrics_broadcaster(self):
        """Broadcast system metrics to subscribers"""
        while self.running:
            try:
                # Generate demo metrics data
                metrics_data = {
                    "cpu_usage": round(random.uniform(20, 80), 1),
                    "memory_usage": round(random.uniform(40, 85), 1),
                    "disk_usage": round(random.uniform(30, 70), 1),
                    "network_in": round(random.uniform(100, 1000), 1),
                    "network_out": round(random.uniform(50, 500), 1),
                    "response_time": round(random.uniform(100, 300), 1),
                    "error_rate": round(random.uniform(0, 5), 2),
                    "active_users": random.randint(50, 500),
                    "requests_per_second": random.randint(100, 1000),
                    "database_connections": random.randint(10, 100)
                }
                
                message = WebSocketMessage(
                    type=MessageType.METRICS_UPDATE.value,
                    channel=SubscriptionChannel.METRICS.value,
                    data=metrics_data,
                    timestamp=datetime.utcnow().isoformat()
                )
                
                await self.broadcast_to_channel(SubscriptionChannel.METRICS.value, message)
                await self.broadcast_to_channel(SubscriptionChannel.ALL.value, message)
                
                await asyncio.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.error(f"Metrics broadcaster error: {e}")
                await asyncio.sleep(5)
    
    async def alert_monitor(self):
        """Generate and broadcast alerts"""
        while self.running:
            try:
                # Randomly generate alerts
                if random.random() < 0.1:  # 10% chance every cycle
                    alert_types = [
                        {
                            "type": MessageType.ALERT_CRITICAL.value,
                            "severity": "critical",
                            "title": "High CPU Usage Detected",
                            "message": "CPU usage has exceeded 90% for more than 5 minutes",
                            "service": "opssight-backend",
                            "threshold": "90%",
                            "current_value": "94.2%"
                        },
                        {
                            "type": MessageType.ALERT_WARNING.value,
                            "severity": "warning", 
                            "title": "Memory Usage High",
                            "message": "Memory usage approaching threshold on database server",
                            "service": "postgres",
                            "threshold": "80%",
                            "current_value": "83.5%"
                        },
                        {
                            "type": MessageType.SECURITY_EVENT.value,
                            "severity": "high",
                            "title": "Suspicious Login Attempt",
                            "message": "Multiple failed login attempts from unknown IP",
                            "source_ip": "192.168.1.100",
                            "attempts": 15,
                            "user_agent": "Automated scanner"
                        }
                    ]
                    
                    alert = random.choice(alert_types)
                    alert_data = {
                        **alert,
                        "alert_id": str(uuid.uuid4()),
                        "acknowledged": False,
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    message = WebSocketMessage(
                        type=alert["type"],
                        channel=SubscriptionChannel.ALERTS.value,
                        data=alert_data,
                        timestamp=datetime.utcnow().isoformat()
                    )
                    
                    await self.broadcast_to_channel(SubscriptionChannel.ALERTS.value, message)
                    await self.broadcast_to_channel(SubscriptionChannel.ALL.value, message)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Alert monitor error: {e}")
                await asyncio.sleep(30)
    
    async def performance_monitor(self):
        """Broadcast performance monitoring data"""
        while self.running:
            try:
                # Generate performance data
                performance_data = {
                    "health_score": random.randint(75, 95),
                    "response_times": {
                        "p50": round(random.uniform(80, 150), 1),
                        "p90": round(random.uniform(150, 300), 1),
                        "p95": round(random.uniform(200, 400), 1),
                        "p99": round(random.uniform(300, 800), 1)
                    },
                    "throughput": {
                        "requests_per_second": random.randint(800, 1500),
                        "bytes_per_second": random.randint(1024*1024, 10*1024*1024)
                    },
                    "errors": {
                        "error_rate": round(random.uniform(0.1, 2.0), 2),
                        "5xx_errors": random.randint(0, 10),
                        "4xx_errors": random.randint(5, 50),
                        "timeout_errors": random.randint(0, 5)
                    },
                    "resource_usage": {
                        "cpu_cores_used": round(random.uniform(2.0, 8.0), 1),
                        "memory_gb_used": round(random.uniform(4.0, 16.0), 1),
                        "disk_io_ops": random.randint(100, 1000),
                        "network_connections": random.randint(50, 500)
                    }
                }
                
                message = WebSocketMessage(
                    type=MessageType.PERFORMANCE_DATA.value,
                    channel=SubscriptionChannel.PERFORMANCE.value,
                    data=performance_data,
                    timestamp=datetime.utcnow().isoformat()
                )
                
                await self.broadcast_to_channel(SubscriptionChannel.PERFORMANCE.value, message)
                await self.broadcast_to_channel(SubscriptionChannel.ALL.value, message)
                
                await asyncio.sleep(10)  # Update every 10 seconds
                
            except Exception as e:
                logger.error(f"Performance monitor error: {e}")
                await asyncio.sleep(10)

# Create global WebSocket manager instance
websocket_manager = WebSocketManager()

async def main():
    """Main entry point"""
    try:
        await websocket_manager.start_server(host="localhost", port=8765)
    except KeyboardInterrupt:
        logger.info("WebSocket server stopped")
    except Exception as e:
        logger.error(f"WebSocket server error: {e}")

if __name__ == "__main__":
    asyncio.run(main())