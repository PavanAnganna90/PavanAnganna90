#!/usr/bin/env python3
"""
Create database tables from SQLAlchemy models.
"""

import asyncio
import os

# Set environment
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

async def create_tables():
    """Create all database tables."""
    try:
        print("🔧 Creating database tables...")
        
        # Import database setup
        from app.db.database import async_engine
        from app.db.models import Base
        
        # Create all tables 
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ All tables created successfully!")
        
        # List created tables
        from sqlalchemy import text
        async with async_engine.begin() as conn:
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            tables = result.fetchall()
            
            print(f"📊 Created {len(tables)} tables:")
            for table in tables:
                print(f"   - {table[0]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_connection():
    """Test database connectivity."""
    try:
        print("🧪 Testing database connection...")
        
        from app.db.database import async_engine
        
        from sqlalchemy import text
        
        async with async_engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            value = result.scalar()
            
        print(f"✅ Database connection successful! Test query returned: {value}")
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

async def main():
    """Main function."""
    print("🚀 Database Setup Script")
    print("=" * 40)
    
    # Test connection first
    if not await test_connection():
        return False
    
    # Create tables
    if not await create_tables():
        return False
    
    print("\n🎉 Database setup completed successfully!")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)