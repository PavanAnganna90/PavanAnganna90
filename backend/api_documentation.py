#!/usr/bin/env python3
"""
API Documentation Generator
Comprehensive documentation for all OpsSight Platform API endpoints
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

class APIDocumentationService:
    """API documentation service for OpsSight Platform"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.api_version = "2.2.0"
        self.base_url = "http://localhost:8000"
        
        # API endpoint documentation
        self.endpoints = self._generate_endpoint_documentation()
        self.authentication = self._generate_auth_documentation()
        self.examples = self._generate_examples()
    
    def _generate_endpoint_documentation(self) -> Dict[str, Any]:
        """Generate comprehensive endpoint documentation"""
        return {
            "authentication": {
                "description": "Authentication and authorization endpoints",
                "endpoints": {
                    "POST /auth/github": {
                        "summary": "Initiate GitHub OAuth flow",
                        "description": "Start GitHub OAuth authentication process",
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "OAuth URL generated successfully",
                                "schema": {
                                    "auth_url": "string",
                                    "state": "string"
                                }
                            }
                        },
                        "example": {
                            "request": "GET /auth/github",
                            "response": {
                                "auth_url": "https://github.com/login/oauth/authorize?client_id=...",
                                "state": "random_state_token"
                            }
                        }
                    },
                    "GET /auth/github/callback": {
                        "summary": "Handle GitHub OAuth callback",
                        "description": "Process OAuth callback and generate JWT token",
                        "parameters": [
                            {"name": "code", "type": "string", "required": True},
                            {"name": "state", "type": "string", "required": True}
                        ],
                        "responses": {
                            "200": {
                                "description": "Authentication successful",
                                "schema": {
                                    "access_token": "string",
                                    "token_type": "string",
                                    "expires_in": "number",
                                    "user": "object"
                                }
                            }
                        }
                    },
                    "GET /auth/demo-token": {
                        "summary": "Get demo authentication token",
                        "description": "Generate demo token for testing (development only)",
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Demo token generated",
                                "schema": {
                                    "access_token": "string",
                                    "token_type": "bearer",
                                    "expires_in": "number",
                                    "user": "object"
                                }
                            }
                        }
                    }
                }
            },
            "core_api": {
                "description": "Core platform API endpoints",
                "endpoints": {
                    "GET /api/v1/health": {
                        "summary": "API health check",
                        "description": "Get API health status and system information",
                        "authentication": False,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "API is healthy",
                                "schema": {
                                    "status": "string",
                                    "timestamp": "string",
                                    "version": "string",
                                    "services": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/me": {
                        "summary": "Get current user information",
                        "description": "Retrieve authenticated user profile and permissions",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "User information retrieved",
                                "schema": {
                                    "user": "object",
                                    "session": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/metrics": {
                        "summary": "Get system metrics",
                        "description": "Retrieve system performance metrics",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Metrics retrieved successfully",
                                "schema": {
                                    "cpu_usage": "number",
                                    "memory_usage": "number",
                                    "disk_usage": "number",
                                    "network_io": "object",
                                    "timestamp": "string"
                                }
                            }
                        }
                    }
                }
            },
            "kubernetes": {
                "description": "Kubernetes cluster monitoring and management",
                "endpoints": {
                    "GET /api/v1/kubernetes/overview": {
                        "summary": "Get Kubernetes cluster overview",
                        "description": "Retrieve cluster status, nodes, and resource utilization",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Cluster overview retrieved",
                                "schema": {
                                    "cluster_status": "object",
                                    "nodes": "array",
                                    "resource_utilization": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/kubernetes/resources": {
                        "summary": "Get Kubernetes resource utilization",
                        "description": "Detailed resource usage across cluster",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Resource utilization data",
                                "schema": {
                                    "cpu": "object",
                                    "memory": "object",
                                    "storage": "object",
                                    "pods": "array"
                                }
                            }
                        }
                    },
                    "GET /api/v1/kubernetes/security": {
                        "summary": "Get Kubernetes security posture",
                        "description": "Security analysis of cluster configuration",
                        "authentication": True,
                        "permissions": ["admin"],
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Security posture analysis",
                                "schema": {
                                    "security_score": "number",
                                    "vulnerabilities": "array",
                                    "compliance": "object"
                                }
                            }
                        }
                    }
                }
            },
            "engineering_intelligence": {
                "description": "Engineering intelligence and SDLC analytics (Typo-style features)",
                "endpoints": {
                    "GET /api/v1/engineering/sdlc": {
                        "summary": "Get SDLC visibility overview",
                        "description": "Software Development Lifecycle insights and delivery metrics",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "SDLC metrics and insights",
                                "schema": {
                                    "delivery_metrics": "object",
                                    "cycle_time": "object",
                                    "throughput": "object",
                                    "quality_metrics": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/engineering/teams": {
                        "summary": "Get team performance analytics",
                        "description": "Team productivity metrics and collaboration insights",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Team performance data",
                                "schema": {
                                    "teams": "array",
                                    "productivity_metrics": "object",
                                    "collaboration_score": "number"
                                }
                            }
                        }
                    },
                    "GET /api/v1/engineering/dora": {
                        "summary": "Get DORA metrics",
                        "description": "DevOps Research & Assessment metrics (Deployment Frequency, Lead Time, MTTR, Change Failure Rate)",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "DORA metrics analysis",
                                "schema": {
                                    "deployment_frequency": "object",
                                    "lead_time_for_changes": "object",
                                    "mean_time_to_recovery": "object",
                                    "change_failure_rate": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/engineering/devex": {
                        "summary": "Get developer experience insights",
                        "description": "Developer satisfaction metrics and friction point analysis",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Developer experience metrics",
                                "schema": {
                                    "satisfaction_score": "number",
                                    "friction_points": "array",
                                    "productivity_blockers": "array"
                                }
                            }
                        }
                    }
                }
            },
            "security_audit": {
                "description": "Security vulnerability management and compliance monitoring",
                "endpoints": {
                    "GET /api/v1/security/overview": {
                        "summary": "Get security overview",
                        "description": "Comprehensive security posture overview",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Security overview data",
                                "schema": {
                                    "security_overview": "object",
                                    "severity_distribution": "object",
                                    "compliance_status": "object",
                                    "threat_intel": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/security/vulnerabilities": {
                        "summary": "Get vulnerability details",
                        "description": "Detailed vulnerability information with filtering",
                        "authentication": True,
                        "parameters": [
                            {"name": "severity", "type": "string", "required": False, "enum": ["critical", "high", "medium", "low"]},
                            {"name": "status", "type": "string", "required": False, "enum": ["open", "in_progress", "resolved"]}
                        ],
                        "responses": {
                            "200": {
                                "description": "Vulnerability details",
                                "schema": {
                                    "vulnerabilities": "array",
                                    "total_count": "number",
                                    "filters_applied": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/security/compliance": {
                        "summary": "Get compliance dashboard",
                        "description": "Compliance framework status (SOC2, PCI-DSS, GDPR, ISO27001)",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Compliance status",
                                "schema": {
                                    "framework_status": "object",
                                    "overall_compliance": "object",
                                    "upcoming_reviews": "array"
                                }
                            }
                        }
                    }
                }
            },
            "deployment_pipeline": {
                "description": "CI/CD pipeline monitoring and deployment analytics",
                "endpoints": {
                    "GET /api/v1/pipeline/overview": {
                        "summary": "Get pipeline overview",
                        "description": "Real-time pipeline status and execution metrics",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Pipeline overview",
                                "schema": {
                                    "overview": "object",
                                    "active_executions": "array",
                                    "environment_status": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/pipeline/analytics": {
                        "summary": "Get deployment analytics",
                        "description": "DORA metrics and deployment trends analysis",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Deployment analytics",
                                "schema": {
                                    "deployment_metrics": "object",
                                    "dora_metrics": "object",
                                    "trends": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/pipeline/environments": {
                        "summary": "Get environment status",
                        "description": "Environment health and deployment history",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Environment status",
                                "schema": {
                                    "environments": "object",
                                    "summary": "object"
                                }
                            }
                        }
                    }
                }
            },
            "git_analytics": {
                "description": "Git platform analytics and repository insights",
                "endpoints": {
                    "GET /api/v1/git/repositories": {
                        "summary": "Get repository analytics",
                        "description": "Comprehensive repository health and activity analysis",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Repository analytics",
                                "schema": {
                                    "overview": "object",
                                    "repository_health": "array",
                                    "language_distribution": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/git/contributors": {
                        "summary": "Get contributor analytics",
                        "description": "Contributor productivity and collaboration patterns",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Contributor analytics",
                                "schema": {
                                    "top_contributors": "array",
                                    "contribution_patterns": "object",
                                    "collaboration_metrics": "object"
                                }
                            }
                        }
                    },
                    "GET /api/v1/git/velocity": {
                        "summary": "Get code velocity analytics",
                        "description": "Code velocity and productivity metrics",
                        "authentication": True,
                        "parameters": [],
                        "responses": {
                            "200": {
                                "description": "Code velocity metrics",
                                "schema": {
                                    "velocity_metrics": "object",
                                    "code_quality_metrics": "object",
                                    "productivity_trends": "object"
                                }
                            }
                        }
                    }
                }
            }
        }
    
    def _generate_auth_documentation(self) -> Dict[str, Any]:
        """Generate authentication documentation"""
        return {
            "overview": "OpsSight Platform uses JWT-based authentication with GitHub OAuth integration",
            "authentication_flow": {
                "1": "Initiate OAuth flow via /auth/github",
                "2": "User authenticates with GitHub",
                "3": "Callback processes OAuth response",
                "4": "JWT token is generated and returned",
                "5": "Use Bearer token for API requests"
            },
            "token_usage": {
                "header_name": "Authorization",
                "token_format": "Bearer <jwt_token>",
                "example": "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            "demo_access": {
                "description": "For development/testing, use demo token endpoint",
                "endpoint": "/auth/demo-token",
                "permissions": ["read", "write", "admin", "deploy"]
            },
            "permissions": {
                "read": "Basic read access to dashboards and metrics",
                "write": "Create and update resources",
                "admin": "Administrative access to user management and security",
                "deploy": "Deployment and infrastructure management"
            }
        }
    
    def _generate_examples(self) -> Dict[str, Any]:
        """Generate API usage examples"""
        return {
            "authentication": {
                "get_demo_token": {
                    "curl": """curl -X GET "http://localhost:8000/auth/demo-token" \\
  -H "Content-Type: application/json" """,
                    "javascript": """const response = await fetch('http://localhost:8000/auth/demo-token');
const tokenData = await response.json();
const authToken = tokenData.access_token;""",
                    "python": """import requests

response = requests.get('http://localhost:8000/auth/demo-token')
token_data = response.json()
auth_token = token_data['access_token']"""
                }
            },
            "metrics": {
                "get_system_metrics": {
                    "curl": """curl -X GET "http://localhost:8000/api/v1/metrics" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" """,
                    "javascript": """const response = await fetch('http://localhost:8000/api/v1/metrics', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
const metrics = await response.json();""",
                    "python": """import requests

headers = {
    'Authorization': f'Bearer {auth_token}',
    'Content-Type': 'application/json'
}
response = requests.get('http://localhost:8000/api/v1/metrics', headers=headers)
metrics = response.json()"""
                }
            },
            "security": {
                "get_vulnerabilities": {
                    "curl": """curl -X GET "http://localhost:8000/api/v1/security/vulnerabilities?severity=critical" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" """,
                    "javascript": """const response = await fetch('http://localhost:8000/api/v1/security/vulnerabilities?severity=critical', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
const vulnerabilities = await response.json();""",
                    "python": """import requests

params = {'severity': 'critical'}
headers = {
    'Authorization': f'Bearer {auth_token}',
    'Content-Type': 'application/json'
}
response = requests.get('http://localhost:8000/api/v1/security/vulnerabilities', 
                       params=params, headers=headers)
vulnerabilities = response.json()"""
                }
            },
            "engineering": {
                "get_dora_metrics": {
                    "curl": """curl -X GET "http://localhost:8000/api/v1/engineering/dora" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" """,
                    "javascript": """const response = await fetch('http://localhost:8000/api/v1/engineering/dora', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});
const doraMetrics = await response.json();""",
                    "python": """import requests

headers = {
    'Authorization': f'Bearer {auth_token}',
    'Content-Type': 'application/json'
}
response = requests.get('http://localhost:8000/api/v1/engineering/dora', headers=headers)
dora_metrics = response.json()"""
                }
            }
        }
    
    async def get_full_documentation(self) -> Dict[str, Any]:
        """Get complete API documentation"""
        return {
            "api_info": {
                "title": "OpsSight Platform API",
                "version": self.api_version,
                "description": "Comprehensive DevOps platform API with engineering intelligence, security auditing, and deployment pipeline management",
                "base_url": self.base_url,
                "documentation_generated": datetime.utcnow().isoformat()
            },
            "authentication": self.authentication,
            "endpoints": self.endpoints,
            "examples": self.examples,
            "error_codes": {
                "400": "Bad Request - Invalid parameters or request format",
                "401": "Unauthorized - Authentication required or invalid token",
                "403": "Forbidden - Insufficient permissions for requested resource",
                "404": "Not Found - Requested resource does not exist",
                "429": "Too Many Requests - Rate limit exceeded",
                "500": "Internal Server Error - Server error occurred"
            },
            "rate_limiting": {
                "description": "API requests are rate limited to prevent abuse",
                "limits": {
                    "authenticated": "1000 requests per hour",
                    "unauthenticated": "100 requests per hour"
                }
            },
            "changelog": {
                "2.2.0": [
                    "Added Security Audit endpoints",
                    "Added Deployment Pipeline analytics", 
                    "Added Engineering Intelligence (Typo-style) features",
                    "Enhanced Git analytics with contributor insights",
                    "Improved authentication with GitHub OAuth"
                ],
                "2.1.0": [
                    "Added Kubernetes monitoring endpoints",
                    "Added Ansible automation tracking",
                    "Enhanced system metrics collection"
                ]
            }
        }
    
    async def get_endpoint_summary(self) -> Dict[str, Any]:
        """Get summary of all available endpoints"""
        endpoint_count = 0
        categories = []
        
        for category, info in self.endpoints.items():
            endpoint_count += len(info["endpoints"])
            categories.append({
                "category": category,
                "description": info["description"],
                "endpoint_count": len(info["endpoints"])
            })
        
        return {
            "total_endpoints": endpoint_count,
            "categories": categories,
            "authentication_required": len([
                endpoint for category in self.endpoints.values()
                for endpoint in category["endpoints"].values()
                if endpoint.get("authentication", True)
            ]),
            "public_endpoints": len([
                endpoint for category in self.endpoints.values()
                for endpoint in category["endpoints"].values()
                if not endpoint.get("authentication", True)
            ])
        }

# Create global instance
api_documentation = APIDocumentationService()

if __name__ == "__main__":
    # Test API documentation features
    async def test_api_documentation():
        print("📚 Testing API Documentation Service")
        print("=" * 50)
        
        # Test endpoint summary
        summary = await api_documentation.get_endpoint_summary()
        print(f"✅ Endpoint Summary:")
        print(f"   • Total Endpoints: {summary['total_endpoints']}")
        print(f"   • Authenticated: {summary['authentication_required']}")
        print(f"   • Public: {summary['public_endpoints']}")
        print(f"   • Categories: {len(summary['categories'])}")
        print()
        
        # Test full documentation
        full_docs = await api_documentation.get_full_documentation()
        print(f"✅ Full Documentation:")
        print(f"   • API Version: {full_docs['api_info']['version']}")
        print(f"   • Base URL: {full_docs['api_info']['base_url']}")
        print(f"   • Categories: {len(full_docs['endpoints'])}")
        print(f"   • Examples: {len(full_docs['examples'])}")
        
        print("\n✅ API documentation system test completed!")
    
    asyncio.run(test_api_documentation())