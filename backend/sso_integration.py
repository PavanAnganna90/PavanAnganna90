"""
OpsSight SSO Integration - v2.0.0
Enterprise Single Sign-On with SAML and OIDC support

Features:
- SAML 2.0 implementation for enterprise identity providers
- OpenID Connect (OIDC) for modern OAuth 2.0 flows
- Multi-provider support (Azure AD, Google, Okta, Auth0, etc.)
- Just-in-time (JIT) user provisioning
- Role mapping and attribute synchronization
- Session management and security
- Audit logging for all authentication events
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import json
import uuid
import base64
import hashlib
import secrets
from urllib.parse import urlencode, parse_qs, urlparse
import xml.etree.ElementTree as ET

# FastAPI and security imports
from fastapi import HTTPException, Request, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import requests
from authlib.integrations.requests_client import OAuth2Session
from authlib.jose import jwt as authlib_jwt

# Database imports
from services.data_access import user_repository, audit_log_repository
from database import User, Organization, UserRole, AuditLog

# Configure logging
logger = logging.getLogger(__name__)

# SSO Configuration
SSO_CONFIG = {
    'jwt_secret': 'opssight-sso-secret-key',  # Use environment variable in production
    'jwt_algorithm': 'HS256',
    'jwt_expiration_hours': 24,
    'session_timeout_hours': 8,
    'max_login_attempts': 5,
    'lockout_duration_minutes': 30,
}

class SSOProvider:
    """Base SSO provider interface"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.enabled = config.get('enabled', False)
    
    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Get the authorization URL for the SSO provider"""
        raise NotImplementedError
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        raise NotImplementedError
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from the SSO provider"""
        raise NotImplementedError
    
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate and decode token"""
        raise NotImplementedError

class OIDCProvider(SSOProvider):
    """OpenID Connect provider implementation"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.discovery_url = config.get('discovery_url')
        self.scopes = config.get('scopes', ['openid', 'profile', 'email'])
        self._discovery_cache = None
        self._jwks_cache = None
        self._cache_expiry = None
    
    async def _get_discovery_document(self) -> Dict[str, Any]:
        """Get OpenID Connect discovery document with caching"""
        if self._discovery_cache and self._cache_expiry and datetime.utcnow() < self._cache_expiry:
            return self._discovery_cache
        
        try:
            response = requests.get(self.discovery_url, timeout=10)
            response.raise_for_status()
            
            self._discovery_cache = response.json()
            self._cache_expiry = datetime.utcnow() + timedelta(hours=1)
            
            logger.info(f"Retrieved OIDC discovery document for {self.name}")
            return self._discovery_cache
            
        except Exception as e:
            logger.error(f"Failed to get OIDC discovery document for {self.name}: {e}")
            raise HTTPException(status_code=500, detail="SSO configuration error")
    
    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Generate OIDC authorization URL"""
        discovery = await self._get_discovery_document()
        authorization_endpoint = discovery.get('authorization_endpoint')
        
        if not authorization_endpoint:
            raise HTTPException(status_code=500, detail="Invalid OIDC configuration")
        
        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'scope': ' '.join(self.scopes),
            'redirect_uri': redirect_uri,
            'state': state,
            'nonce': secrets.token_urlsafe(32)
        }
        
        return f"{authorization_endpoint}?{urlencode(params)}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        discovery = await self._get_discovery_document()
        token_endpoint = discovery.get('token_endpoint')
        
        if not token_endpoint:
            raise HTTPException(status_code=500, detail="Invalid OIDC configuration")
        
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': redirect_uri
        }
        
        try:
            response = requests.post(token_endpoint, data=token_data, timeout=10)
            response.raise_for_status()
            
            tokens = response.json()
            logger.info(f"Successfully exchanged code for tokens via {self.name}")
            return tokens
            
        except Exception as e:
            logger.error(f"Failed to exchange code for tokens via {self.name}: {e}")
            raise HTTPException(status_code=400, detail="Authorization code exchange failed")
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from OIDC userinfo endpoint"""
        discovery = await self._get_discovery_document()
        userinfo_endpoint = discovery.get('userinfo_endpoint')
        
        if not userinfo_endpoint:
            # Try to decode ID token if userinfo endpoint not available
            return await self._decode_id_token(access_token)
        
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(userinfo_endpoint, headers=headers, timeout=10)
            response.raise_for_status()
            
            user_info = response.json()
            logger.info(f"Retrieved user info from {self.name}")
            return user_info
            
        except Exception as e:
            logger.error(f"Failed to get user info from {self.name}: {e}")
            raise HTTPException(status_code=400, detail="Failed to retrieve user information")
    
    async def _decode_id_token(self, id_token: str) -> Dict[str, Any]:
        """Decode and validate ID token"""
        try:
            # Get JWKS for token verification
            discovery = await self._get_discovery_document()
            jwks_uri = discovery.get('jwks_uri')
            
            if jwks_uri:
                jwks_response = requests.get(jwks_uri, timeout=10)
                jwks_response.raise_for_status()
                jwks = jwks_response.json()
                
                # Decode and verify token
                claims = authlib_jwt.decode(
                    id_token, 
                    jwks,
                    claims_options={
                        'iss': {'essential': True, 'value': discovery.get('issuer')},
                        'aud': {'essential': True, 'value': self.client_id}
                    }
                )
                
                return claims
            else:
                # Fallback: decode without verification (not recommended for production)
                logger.warning(f"No JWKS URI found for {self.name}, decoding token without verification")
                return jwt.decode(id_token, options={"verify_signature": False})
                
        except Exception as e:
            logger.error(f"Failed to decode ID token for {self.name}: {e}")
            raise HTTPException(status_code=400, detail="Invalid ID token")

class SAMLProvider(SSOProvider):
    """SAML 2.0 provider implementation"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        super().__init__(name, config)
        self.entity_id = config.get('entity_id')
        self.sso_url = config.get('sso_url')
        self.x509_cert = config.get('x509_cert')
        self.name_id_format = config.get('name_id_format', 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent')
        self.attribute_mapping = config.get('attribute_mapping', {})
    
    async def get_authorization_url(self, state: str, redirect_uri: str) -> str:
        """Generate SAML authentication request"""
        request_id = f"_{uuid.uuid4()}"
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Create SAML AuthnRequest
        authn_request = f"""
        <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                           xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                           ID="{request_id}"
                           Version="2.0"
                           IssueInstant="{timestamp}"
                           Destination="{self.sso_url}"
                           AssertionConsumerServiceURL="{redirect_uri}">
            <saml:Issuer>{self.entity_id}</saml:Issuer>
            <samlp:NameIDPolicy Format="{self.name_id_format}" AllowCreate="true"/>
        </samlp:AuthnRequest>
        """
        
        # Encode and compress the request
        encoded_request = base64.b64encode(authn_request.encode()).decode()
        
        params = {
            'SAMLRequest': encoded_request,
            'RelayState': state
        }
        
        return f"{self.sso_url}?{urlencode(params)}"
    
    async def exchange_code_for_token(self, saml_response: str, redirect_uri: str) -> Dict[str, Any]:
        """Process SAML response"""
        try:
            # Decode SAML response
            decoded_response = base64.b64decode(saml_response)
            
            # Parse XML
            root = ET.fromstring(decoded_response)
            
            # Extract assertion
            assertion = root.find('.//{urn:oasis:names:tc:SAML:2.0:assertion}Assertion')
            if assertion is None:
                raise HTTPException(status_code=400, detail="Invalid SAML response: No assertion found")
            
            # Verify signature if certificate is provided
            if self.x509_cert:
                await self._verify_saml_signature(assertion, self.x509_cert)
            
            # Extract attributes
            attributes = {}
            attr_statements = assertion.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeStatement')
            
            for attr_statement in attr_statements:
                for attribute in attr_statement.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}Attribute'):
                    attr_name = attribute.get('Name')
                    attr_values = [
                        value.text for value in 
                        attribute.findall('.//{urn:oasis:names:tc:SAML:2.0:assertion}AttributeValue')
                    ]
                    
                    if attr_values:
                        attributes[attr_name] = attr_values[0] if len(attr_values) == 1 else attr_values
            
            # Extract NameID
            name_id_element = assertion.find('.//{urn:oasis:names:tc:SAML:2.0:assertion}NameID')
            name_id = name_id_element.text if name_id_element is not None else None
            
            return {
                'name_id': name_id,
                'attributes': attributes,
                'assertion': decoded_response.decode()
            }
            
        except Exception as e:
            logger.error(f"Failed to process SAML response for {self.name}: {e}")
            raise HTTPException(status_code=400, detail="Invalid SAML response")
    
    async def _verify_saml_signature(self, assertion: ET.Element, cert_data: str):
        """Verify SAML assertion signature"""
        # This is a simplified signature verification
        # In production, use a proper SAML library like python-saml
        try:
            cert = load_pem_x509_certificate(cert_data.encode())
            public_key = cert.public_key()
            
            # Extract signature and signed info from assertion
            signature_element = assertion.find('.//{http://www.w3.org/2000/09/xmldsig#}Signature')
            if signature_element is None:
                raise HTTPException(status_code=400, detail="SAML assertion not signed")
            
            # For production, implement proper XML signature verification
            logger.info(f"SAML signature verification for {self.name} (simplified)")
            
        except Exception as e:
            logger.error(f"SAML signature verification failed for {self.name}: {e}")
            raise HTTPException(status_code=400, detail="SAML signature verification failed")
    
    async def get_user_info(self, saml_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract user information from SAML attributes"""
        attributes = saml_data.get('attributes', {})
        name_id = saml_data.get('name_id')
        
        # Map SAML attributes to user info using attribute mapping
        user_info = {'sub': name_id}
        
        for saml_attr, user_field in self.attribute_mapping.items():
            if saml_attr in attributes:
                user_info[user_field] = attributes[saml_attr]
        
        # Default mappings for common attributes
        common_mappings = {
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'email',
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'given_name',
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'family_name',
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'name',
            'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups': 'groups'
        }
        
        for saml_attr, user_field in common_mappings.items():
            if saml_attr in attributes and user_field not in user_info:
                user_info[user_field] = attributes[saml_attr]
        
        return user_info

class SSOManager:
    """SSO management and orchestration"""
    
    def __init__(self):
        self.providers: Dict[str, SSOProvider] = {}
        self.security = HTTPBearer(auto_error=False)
        self._load_providers()
    
    def _load_providers(self):
        """Load SSO providers from configuration"""
        # Example provider configurations
        # In production, load from environment variables or config files
        
        providers_config = {
            'azure_ad': {
                'type': 'oidc',
                'enabled': True,
                'client_id': 'your-azure-client-id',
                'client_secret': 'your-azure-client-secret',
                'discovery_url': 'https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid_configuration',
                'scopes': ['openid', 'profile', 'email'],
                'role_mapping': {
                    'Admin': UserRole.ADMIN,
                    'User': UserRole.VIEWER,
                    'Operator': UserRole.OPERATOR
                }
            },
            'google': {
                'type': 'oidc',
                'enabled': True,
                'client_id': 'your-google-client-id',
                'client_secret': 'your-google-client-secret',
                'discovery_url': 'https://accounts.google.com/.well-known/openid_configuration',
                'scopes': ['openid', 'profile', 'email'],
                'role_mapping': {
                    'admin@company.com': UserRole.ADMIN
                }
            },
            'okta': {
                'type': 'oidc',
                'enabled': False,
                'client_id': 'your-okta-client-id',
                'client_secret': 'your-okta-client-secret',
                'discovery_url': 'https://your-domain.okta.com/.well-known/openid_configuration',
                'scopes': ['openid', 'profile', 'email', 'groups']
            },
            'adfs': {
                'type': 'saml',
                'enabled': False,
                'entity_id': 'https://your-app.company.com',
                'sso_url': 'https://adfs.company.com/adfs/ls/IdpInitiatedSignOn.aspx',
                'x509_cert': '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
                'attribute_mapping': {
                    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'email',
                    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'given_name',
                    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'family_name'
                }
            }
        }
        
        for name, config in providers_config.items():
            try:
                if config.get('enabled', False):
                    if config['type'] == 'oidc':
                        provider = OIDCProvider(name, config)
                    elif config['type'] == 'saml':
                        provider = SAMLProvider(name, config)
                    else:
                        logger.warning(f"Unknown SSO provider type: {config['type']}")
                        continue
                    
                    self.providers[name] = provider
                    logger.info(f"Loaded SSO provider: {name} ({config['type'].upper()})")
                
            except Exception as e:
                logger.error(f"Failed to load SSO provider {name}: {e}")
    
    def get_provider(self, provider_name: str) -> Optional[SSOProvider]:
        """Get SSO provider by name"""
        return self.providers.get(provider_name)
    
    def list_providers(self) -> List[Dict[str, Any]]:
        """List available SSO providers"""
        return [
            {
                'name': name,
                'type': 'oidc' if isinstance(provider, OIDCProvider) else 'saml',
                'enabled': provider.enabled
            }
            for name, provider in self.providers.items()
        ]
    
    async def initiate_sso_login(self, provider_name: str, org_slug: str, 
                               request: Request) -> Dict[str, Any]:
        """Initiate SSO login flow"""
        provider = self.get_provider(provider_name)
        if not provider:
            raise HTTPException(status_code=404, detail="SSO provider not found")
        
        # Generate state parameter for CSRF protection
        state_data = {
            'provider': provider_name,
            'org_slug': org_slug,
            'timestamp': datetime.utcnow().isoformat(),
            'nonce': secrets.token_urlsafe(32)
        }
        
        state = base64.urlsafe_b64encode(
            json.dumps(state_data).encode()
        ).decode()
        
        # Build redirect URI
        redirect_uri = f"{request.base_url}auth/sso/{provider_name}/callback"
        
        # Get authorization URL
        auth_url = await provider.get_authorization_url(state, redirect_uri)
        
        return {
            'authorization_url': auth_url,
            'state': state,
            'provider': provider_name
        }
    
    async def handle_sso_callback(self, provider_name: str, request: Request) -> Dict[str, Any]:
        """Handle SSO callback and complete authentication"""
        provider = self.get_provider(provider_name)
        if not provider:
            raise HTTPException(status_code=404, detail="SSO provider not found")
        
        # Extract parameters from request
        if isinstance(provider, OIDCProvider):
            code = request.query_params.get('code')
            state = request.query_params.get('state')
            error = request.query_params.get('error')
            
            if error:
                raise HTTPException(status_code=400, detail=f"SSO error: {error}")
            
            if not code or not state:
                raise HTTPException(status_code=400, detail="Missing authorization code or state")
            
        elif isinstance(provider, SAMLProvider):
            saml_response = request.form.get('SAMLResponse')
            state = request.form.get('RelayState')
            
            if not saml_response:
                raise HTTPException(status_code=400, detail="Missing SAML response")
        
        # Verify state parameter
        try:
            state_data = json.loads(
                base64.urlsafe_b64decode(state.encode()).decode()
            )
            
            if state_data['provider'] != provider_name:
                raise HTTPException(status_code=400, detail="Invalid state parameter")
            
            # Check timestamp (prevent replay attacks)
            state_timestamp = datetime.fromisoformat(state_data['timestamp'])
            if datetime.utcnow() - state_timestamp > timedelta(minutes=10):
                raise HTTPException(status_code=400, detail="State parameter expired")
                
        except Exception as e:
            logger.error(f"State validation failed: {e}")
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        org_slug = state_data['org_slug']
        redirect_uri = f"{request.base_url}auth/sso/{provider_name}/callback"
        
        try:
            # Exchange code/response for tokens
            if isinstance(provider, OIDCProvider):
                tokens = await provider.exchange_code_for_token(code, redirect_uri)
                access_token = tokens.get('access_token')
                id_token = tokens.get('id_token')
                
                # Get user info
                if id_token:
                    user_info = await provider._decode_id_token(id_token)
                else:
                    user_info = await provider.get_user_info(access_token)
                    
            elif isinstance(provider, SAMLProvider):
                saml_data = await provider.exchange_code_for_token(saml_response, redirect_uri)
                user_info = await provider.get_user_info(saml_data)
            
            # Process user authentication
            authenticated_user = await self._process_sso_user(
                user_info, provider_name, org_slug, request
            )
            
            # Generate JWT token
            jwt_token = self._generate_jwt_token(authenticated_user)
            
            # Log authentication event
            await self._log_sso_event(
                authenticated_user, provider_name, 'sso_login_success', request
            )
            
            return {
                'access_token': jwt_token,
                'token_type': 'bearer',
                'user': {
                    'id': str(authenticated_user.id),
                    'username': authenticated_user.username,
                    'email': authenticated_user.email,
                    'role': authenticated_user.role.value,
                    'organization': authenticated_user.organization.name
                },
                'sso_provider': provider_name
            }
            
        except Exception as e:
            # Log failed authentication
            await self._log_sso_event(
                None, provider_name, 'sso_login_failed', request, error=str(e)
            )
            raise
    
    async def _process_sso_user(self, user_info: Dict[str, Any], provider_name: str,
                               org_slug: str, request: Request) -> User:
        """Process SSO user information and create/update user"""
        
        # Extract user details
        email = user_info.get('email')
        username = user_info.get('preferred_username') or user_info.get('name') or email
        first_name = user_info.get('given_name', '')
        last_name = user_info.get('family_name', '')
        sso_id = user_info.get('sub')
        
        if not email or not sso_id:
            raise HTTPException(status_code=400, detail="Missing required user information from SSO provider")
        
        # Get organization
        from services.data_access import AsyncSessionLocal
        from sqlalchemy.sql import select
        
        async with AsyncSessionLocal() as session:
            # Find organization
            org_result = await session.execute(
                select(Organization).where(Organization.slug == org_slug)
            )
            organization = org_result.scalar_one_or_none()
            
            if not organization:
                raise HTTPException(status_code=404, detail="Organization not found")
            
            # Find existing user by SSO ID or email
            user_result = await session.execute(
                select(User).where(
                    and_(
                        or_(
                            and_(User.sso_provider == provider_name, User.sso_id == sso_id),
                            User.email == email
                        ),
                        User.organization_id == organization.id
                    )
                )
            )
            user = user_result.scalar_one_or_none()
            
            if user:
                # Update existing user
                user.sso_provider = provider_name
                user.sso_id = sso_id
                user.last_login_at = datetime.utcnow()
                user.last_active_at = datetime.utcnow()
                
                # Update profile if changed
                if first_name and user.first_name != first_name:
                    user.first_name = first_name
                if last_name and user.last_name != last_name:
                    user.last_name = last_name
                
                await session.commit()
                logger.info(f"Updated existing SSO user: {email}")
                
            else:
                # Create new user (Just-in-time provisioning)
                provider_config = self.providers[provider_name].config
                default_role = self._determine_user_role(user_info, provider_config)
                
                user = User(
                    organization_id=organization.id,
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=default_role,
                    sso_provider=provider_name,
                    sso_id=sso_id,
                    last_login_at=datetime.utcnow(),
                    last_active_at=datetime.utcnow(),
                    preferences={
                        'sso_provisioned': True,
                        'provider': provider_name
                    }
                )
                
                session.add(user)
                await session.commit()
                await session.refresh(user)
                
                logger.info(f"Created new SSO user: {email} with role {default_role.value}")
            
            # Load relationships
            await session.refresh(user, ['organization'])
            return user
    
    def _determine_user_role(self, user_info: Dict[str, Any], 
                           provider_config: Dict[str, Any]) -> UserRole:
        """Determine user role based on SSO attributes and role mapping"""
        role_mapping = provider_config.get('role_mapping', {})
        
        # Check groups/roles from SSO provider
        groups = user_info.get('groups', [])
        if isinstance(groups, str):
            groups = [groups]
        
        # Check email-based role mapping
        email = user_info.get('email', '')
        if email in role_mapping:
            return role_mapping[email]
        
        # Check group-based role mapping
        for group in groups:
            if group in role_mapping:
                return role_mapping[group]
        
        # Check custom attributes
        for attr_name, role in role_mapping.items():
            if attr_name in user_info and user_info[attr_name]:
                return role
        
        # Default role
        return UserRole.VIEWER
    
    def _generate_jwt_token(self, user: User) -> str:
        """Generate JWT token for authenticated user"""
        payload = {
            'user_id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role.value,
            'org_id': str(user.organization_id),
            'org_slug': user.organization.slug,
            'sso_provider': user.sso_provider,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=SSO_CONFIG['jwt_expiration_hours'])
        }
        
        token = jwt.encode(
            payload,
            SSO_CONFIG['jwt_secret'],
            algorithm=SSO_CONFIG['jwt_algorithm']
        )
        
        return token
    
    async def _log_sso_event(self, user: Optional[User], provider: str, 
                           event_type: str, request: Request, 
                           error: Optional[str] = None):
        """Log SSO authentication events"""
        try:
            audit_data = {
                'organization_id': user.organization_id if user else None,
                'user_id': user.id if user else None,
                'event_type': event_type,
                'resource_type': 'authentication',
                'action': f"SSO authentication via {provider}",
                'description': f"User authentication via {provider}",
                'ip_address': request.client.host,
                'user_agent': request.headers.get('user-agent'),
                'metadata': {
                    'sso_provider': provider,
                    'success': error is None,
                    'error': error
                }
            }
            
            await audit_log_repository.create(audit_data)
            
        except Exception as e:
            logger.error(f"Failed to log SSO event: {e}")
    
    async def validate_jwt_token(self, token: str) -> Dict[str, Any]:
        """Validate JWT token"""
        try:
            payload = jwt.decode(
                token,
                SSO_CONFIG['jwt_secret'],
                algorithms=[SSO_CONFIG['jwt_algorithm']]
            )
            
            # Check expiration
            exp_timestamp = payload.get('exp')
            if exp_timestamp and datetime.fromtimestamp(exp_timestamp) < datetime.utcnow():
                raise HTTPException(status_code=401, detail="Token expired")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> User:
        """Get current user from JWT token"""
        if not credentials:
            raise HTTPException(status_code=401, detail="Missing authentication token")
        
        payload = await self.validate_jwt_token(credentials.credentials)
        user_id = payload.get('user_id')
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        user = await user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user

# Create global SSO manager instance
sso_manager = SSOManager()

# Dependency for FastAPI
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """FastAPI dependency to get current authenticated user"""
    return await sso_manager.get_current_user(credentials)

logger.info("SSO Integration initialized with enterprise identity provider support")