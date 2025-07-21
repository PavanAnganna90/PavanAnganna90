#!/usr/bin/env python3
"""
Test database connectivity with the real database.
"""

import asyncio
import os
from datetime import datetime

# Set environment variables
os.environ.update({
    'DATABASE_URL': 'postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev',
    'CORS_ORIGINS': 'http://localhost:3000',
    'ALLOWED_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight',
    'APP_ENV': 'development',
    'CSRF_SECRET': 'dev-csrf-secret',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/callback',
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'SECURITY_JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'GITHUB_CLIENT_ID': 'dev-client-id',
    'GITHUB_CLIENT_SECRET': 'dev-client-secret',
    'DEBUG': 'true',
    'ENVIRONMENT': 'development'
})

async def test_basic_connectivity():
    """Test basic database connectivity."""
    print("🔍 Testing: Basic Database Connectivity")
    
    try:
        from app.db.database import async_engine
        from sqlalchemy import text
        
        async with async_engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ PostgreSQL Version: {version[:50]}...")
            
            # Test basic query
            result = await conn.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
            table_count = result.scalar()
            print(f"✅ Database has {table_count} tables")
            
        return True
    except Exception as e:
        print(f"❌ Database connectivity failed: {e}")
        return False

async def test_table_operations():
    """Test basic CRUD operations on tables."""
    print("\n🔍 Testing: Table Operations")
    
    try:
        from app.db.database import get_async_session
        from app.models import Organization, User, SystemRole
        from sqlalchemy import select
        
        from app.db.database import AsyncSessionLocal
        
        # Create async session
        async with AsyncSessionLocal() as session:
            # Test Organization table
            result = await session.execute(select(Organization).limit(1))
            orgs = result.scalars().all()
            print(f"✅ Organizations table accessible, found {len(orgs)} records")
            
            # Test Users table
            result = await session.execute(select(User).limit(1))
            users = result.scalars().all()
            print(f"✅ Users table accessible, found {len(users)} records")
                
        return True
    except Exception as e:
        print(f"❌ Table operations failed: {e}")
        return False

async def test_model_creation():
    """Test creating sample data."""
    print("\n🔍 Testing: Model Creation")
    
    try:
        from app.db.database import get_async_session
        from app.models import Organization
        
        from app.db.database import AsyncSessionLocal
        
        # Create async session
        async with AsyncSessionLocal() as session:
            # Create a test organization
            test_org = Organization(
                name="Test Organization",
                slug="test-org",
                description="A test organization for database connectivity",
                is_active=True
            )
            
            session.add(test_org)
            await session.commit()
            await session.refresh(test_org)
            
            print(f"✅ Created test organization: {test_org.name} (ID: {test_org.id})")
            
            # Clean up - delete the test organization
            await session.delete(test_org)
            await session.commit()
            print("✅ Cleaned up test organization")
                
        return True
    except Exception as e:
        print(f"❌ Model creation failed: {e}")
        return False

async def test_enum_operations():
    """Test enum type operations."""
    print("\n🔍 Testing: Enum Operations")
    
    try:
        from app.models import SystemRole, PermissionType
        
        # Test SystemRole enum
        print(f"✅ SystemRole enum values: {[role.value for role in SystemRole]}")
        
        # Test PermissionType enum
        print(f"✅ PermissionType enum has {len(PermissionType)} values")
        
        return True
    except Exception as e:
        print(f"❌ Enum operations failed: {e}")
        return False

async def main():
    """Main test function."""
    print("🚀 Database Connectivity Test")
    print("=" * 50)
    
    tests = [
        ("Basic Connectivity", test_basic_connectivity),
        ("Table Operations", test_table_operations),
        ("Model Creation", test_model_creation),
        ("Enum Operations", test_enum_operations),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if await test_func():
                passed += 1
                print(f"✅ PASS {test_name}")
            else:
                print(f"❌ FAIL {test_name}")
        except Exception as e:
            print(f"❌ FAIL {test_name}: {e}")
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print("=" * 50)
    
    for i, (test_name, _) in enumerate(tests):
        status = "✅ PASS" if i < passed else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All database connectivity tests passed!")
        return True
    else:
        print("⚠️ Some database tests failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)