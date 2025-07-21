# OpsSight Backend - API Design Patterns

## RESTful API Patterns

### Resource Naming
```python
# Pattern: /api/v1/{resource}/{id}/{sub-resource}
GET    /api/v1/teams                 # List all teams
POST   /api/v1/teams                 # Create new team
GET    /api/v1/teams/{id}            # Get specific team
PUT    /api/v1/teams/{id}            # Update team
DELETE /api/v1/teams/{id}            # Delete team
GET    /api/v1/teams/{id}/members    # Get team members
POST   /api/v1/teams/{id}/members    # Add team member
```

### Query Parameters
```python
# Pagination
GET /api/v1/alerts?page=1&size=20

# Filtering
GET /api/v1/pipelines?status=running&team_id=123

# Sorting
GET /api/v1/costs?sort_by=amount&order=desc

# Field selection
GET /api/v1/users?fields=id,name,email

# Date ranges
GET /api/v1/metrics?start_date=2024-01-01&end_date=2024-01-31
```

### Response Format
```python
# Success Response
{
    "status": "success",
    "data": {
        "id": "123",
        "name": "DevOps Team",
        "created_at": "2024-01-01T00:00:00Z"
    },
    "meta": {
        "page": 1,
        "total_pages": 5,
        "total_items": 100
    }
}

# Error Response
{
    "status": "error",
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": {
            "field": "email",
            "reason": "Invalid email format"
        }
    },
    "request_id": "abc-123-def"
}
```

## Authentication Patterns

### JWT Token Flow
```python
# 1. Login
POST /api/v1/auth/login
{
    "email": "user@example.com",
    "password": "secure_password"
}

# Response
{
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "Bearer",
    "expires_in": 3600
}

# 2. Use Token
GET /api/v1/protected/resource
Authorization: Bearer eyJ...

# 3. Refresh Token
POST /api/v1/auth/refresh
{
    "refresh_token": "eyJ..."
}
```

### OAuth2 Flow
```python
# 1. Initialize OAuth
GET /api/v1/auth/oauth/github?redirect_uri=https://app.com/callback

# 2. Callback handling
GET /api/v1/auth/oauth/github/callback?code=xxx&state=yyy

# 3. Exchange for JWT
POST /api/v1/auth/oauth/token
{
    "provider": "github",
    "code": "xxx"
}
```

## Caching Patterns

### Cache Headers
```python
# Response headers for cached data
Cache-Control: public, max-age=300
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT

# Conditional requests
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
If-Modified-Since: Wed, 21 Oct 2024 07:28:00 GMT
```

### Cache Decorators
```python
from app.core.cache_decorators import cache_response

@router.get("/metrics")
@cache_response(ttl=300, key_prefix="metrics", tags=["metrics"])
async def get_metrics():
    return await metrics_service.get_all()
```

## WebSocket Patterns

### Connection Lifecycle
```javascript
// 1. Connect with authentication
const ws = new WebSocket('wss://api.opssight.com/ws?token=xxx');

// 2. Subscribe to channels
ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['pipelines', 'alerts', 'metrics']
}));

// 3. Receive updates
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch(data.type) {
        case 'pipeline_update':
            handlePipelineUpdate(data.payload);
            break;
        case 'alert':
            handleNewAlert(data.payload);
            break;
    }
};
```

### Message Format
```json
{
    "type": "pipeline_update",
    "channel": "pipelines",
    "payload": {
        "id": "123",
        "status": "running",
        "progress": 75
    },
    "timestamp": "2024-01-01T00:00:00Z",
    "correlation_id": "abc-123"
}
```

## Error Handling Patterns

### Standard Error Codes
```python
# Application error codes
AUTHENTICATION_REQUIRED = "AUTH_001"
INVALID_CREDENTIALS = "AUTH_002"
TOKEN_EXPIRED = "AUTH_003"
PERMISSION_DENIED = "AUTH_004"

RESOURCE_NOT_FOUND = "RES_001"
RESOURCE_ALREADY_EXISTS = "RES_002"
RESOURCE_CONFLICT = "RES_003"

VALIDATION_ERROR = "VAL_001"
INVALID_INPUT = "VAL_002"
MISSING_REQUIRED_FIELD = "VAL_003"

RATE_LIMIT_EXCEEDED = "RATE_001"
QUOTA_EXCEEDED = "QUOTA_001"

INTERNAL_ERROR = "INT_001"
DATABASE_ERROR = "INT_002"
EXTERNAL_SERVICE_ERROR = "INT_003"
```

### Error Response Structure
```python
from fastapi import HTTPException

class APIError(HTTPException):
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: dict = None
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code,
                "message": message,
                "details": details or {}
            }
        )
```

## Batch Operations

### Bulk Create
```python
POST /api/v1/alerts/bulk
{
    "alerts": [
        {"title": "Alert 1", "severity": "high"},
        {"title": "Alert 2", "severity": "medium"}
    ]
}

# Response
{
    "created": 2,
    "failed": 0,
    "results": [
        {"id": "123", "status": "created"},
        {"id": "124", "status": "created"}
    ]
}
```

### Bulk Update
```python
PATCH /api/v1/pipelines/bulk
{
    "operation": "update_status",
    "filters": {"team_id": "123"},
    "data": {"status": "paused"}
}

# Response
{
    "updated": 5,
    "matched": 5
}
```

## Async Operations

### Long-running Tasks
```python
# 1. Initiate async operation
POST /api/v1/infrastructure/terraform/apply
{
    "workspace": "production",
    "plan_id": "abc-123"
}

# Response
{
    "task_id": "task-456",
    "status": "pending",
    "status_url": "/api/v1/tasks/task-456"
}

# 2. Check status
GET /api/v1/tasks/task-456

# Response
{
    "task_id": "task-456",
    "status": "running",
    "progress": 45,
    "eta": "2024-01-01T00:05:00Z"
}

# 3. Get result
GET /api/v1/tasks/task-456/result
```

## Versioning Strategy

### URL Versioning
```
/api/v1/users  # Current stable version
/api/v2/users  # Next version (breaking changes)
/api/beta/users  # Experimental features
```

### Header Versioning
```
GET /api/users
API-Version: 2024-01-01
```

### Deprecation Notice
```python
# Response header for deprecated endpoints
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: true
Link: </api/v2/users>; rel="successor-version"
```

## Rate Limiting

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
X-RateLimit-Bucket: api
```

### Different Limits
```python
# Configuration
RATE_LIMITS = {
    "anonymous": "10/minute",
    "authenticated": "100/minute",
    "premium": "1000/minute",
    "admin": "unlimited"
}
```

## Webhook Patterns

### Webhook Registration
```python
POST /api/v1/webhooks
{
    "url": "https://example.com/webhook",
    "events": ["pipeline.completed", "alert.triggered"],
    "secret": "webhook_secret_key"
}
```

### Webhook Payload
```python
# Headers
X-OpsSight-Event: pipeline.completed
X-OpsSight-Signature: sha256=xxx
X-OpsSight-Delivery: abc-123

# Body
{
    "event": "pipeline.completed",
    "timestamp": "2024-01-01T00:00:00Z",
    "data": {
        "pipeline_id": "123",
        "status": "success",
        "duration": 300
    }
}
```

## GraphQL Integration (Future)

### Query Example
```graphql
query GetTeamPipelines($teamId: ID!, $status: PipelineStatus) {
  team(id: $teamId) {
    id
    name
    pipelines(status: $status) {
      edges {
        node {
          id
          name
          status
          lastRun {
            id
            startedAt
            completedAt
            status
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

## Best Practices

### 1. Idempotency
- Use idempotency keys for critical operations
- Return same response for duplicate requests

### 2. Pagination
- Always paginate list endpoints
- Support cursor-based pagination for large datasets

### 3. Filtering
- Support multiple filter parameters
- Use consistent naming (e.g., `status`, `created_after`)

### 4. Partial Updates
- Support PATCH for partial updates
- Use JSON Patch for complex updates

### 5. Consistency
- Use consistent naming conventions
- Standardize response formats
- Document all endpoints thoroughly