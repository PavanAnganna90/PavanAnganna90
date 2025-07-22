#!/usr/bin/env python3
"""
Basic Sample Data Generator for OpsSight DevOps Platform
Creates minimal sample data using raw SQL to avoid model relationship issues.
"""

import asyncio
import os
import logging

# Set environment variables
os.environ.update({
    'DATABASE_URL': 'postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev',
    'CORS_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight',
    'APP_ENV': 'development',
    'SECRET_KEY': 'local-development-secret-key-for-testing-only-must-be-at-least-32-chars',
    'JWT_SECRET_KEY': 'local-development-secret-key-for-testing-only-must-be-at-least-32-chars',
    'SECURITY_JWT_SECRET_KEY': 'local-development-secret-key-for-testing-only-must-be-at-least-32-chars',
    'JWT_ALGORITHM': 'HS256',
    'JWT_ACCESS_TOKEN_EXPIRE_MINUTES': '60',
    'JWT_REFRESH_TOKEN_EXPIRE_DAYS': '7',
    'CSRF_SECRET': 'local-csrf-secret-for-development-only',
    'GITHUB_CLIENT_ID': 'dev-client-id',
    'GITHUB_CLIENT_SECRET': 'dev-client-secret',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/github/callback',
    'REDIS_URL': 'redis://localhost:6379/0',
    'DEBUG': 'true',
    'ENVIRONMENT': 'development'
})

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Import database
from app.db.database import async_engine

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def create_basic_sample_data():
    """Create basic sample data with minimal complexity."""
    logger.info("🌱 Creating basic sample data...")
    
    async with async_engine.begin() as conn:
        
        # 1. Create Organizations (with all required fields)
        logger.info("🏢 Creating organizations...")
        await conn.execute(text("""
            INSERT INTO organizations (name, slug, display_name, description, website, contact_email, 
                                     timezone, currency, date_format, is_active, is_verified, subscription_tier, 
                                     max_users, max_projects, max_clusters, storage_limit_gb, settings)
            VALUES 
                ('TechCorp Solutions', 'techcorp', 'TechCorp Solutions Inc.', 
                 'Leading technology solutions provider', 'https://techcorp.com', 'contact@techcorp.com',
                 'America/Los_Angeles', 'USD', 'YYYY-MM-DD', true, true, 'enterprise', 100, 50, 20, 100,
                 '{"features": ["rbac", "monitoring"], "security": {"require_2fa": true}}')
        """))
        
        # 2. Create Users (with organization_id)
        logger.info("👥 Creating users...")
        await conn.execute(text("""
            INSERT INTO users (organization_id, github_id, github_username, email, full_name, 
                              avatar_url, bio, location, company, is_active, is_superuser, last_login)
            VALUES 
                ((SELECT id FROM organizations WHERE slug = 'techcorp'), '12345678', 'alice_smith', 
                 'alice.smith@techcorp.com', 'Alice Smith', 
                 'https://avatars.githubusercontent.com/u/12345678?v=4',
                 'Senior DevOps Engineer with 8+ years experience', 'San Francisco, CA', 'TechCorp Solutions',
                 true, false, NOW() - INTERVAL '2 hours'),
                ((SELECT id FROM organizations WHERE slug = 'techcorp'), '23456789', 'bob_wilson',
                 'bob.wilson@techcorp.com', 'Bob Wilson',
                 'https://avatars.githubusercontent.com/u/23456789?v=4',
                 'Platform Engineer specializing in Kubernetes', 'Seattle, WA', 'TechCorp Solutions',
                 true, false, NOW() - INTERVAL '1 hour')
        """))
        
        # Skip teams for now due to complex constraints
        # Can add teams later once we understand all requirements
        
        logger.info("✅ Basic sample data creation completed successfully!")


async def get_basic_data_summary():
    """Get summary of created data."""
    logger.info("📊 Generating data summary...")
    
    async with async_engine.begin() as conn:
        
        # Count records in each table
        tables = ['organizations', 'users']
        
        summary = {}
        for table in tables:
            result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            summary[table] = count
        
        return summary


async def main():
    """Main function to run basic sample data generation."""
    logger.info("🚀 Initializing basic sample data generation...")
    
    try:
        # Create sample data
        await create_basic_sample_data()
        
        # Get summary
        summary = await get_basic_data_summary()
        
        logger.info("✅ Basic sample data generation completed successfully!")
        
        # Print summary
        print("\n🌱 Sample Data Generation Summary:")
        print("=" * 50)
        total_objects = 0
        for table, count in summary.items():
            if count > 0:
                print(f"  📊 {table.replace('_', ' ').title()}: {count}")
                total_objects += count
        
        print(f"\n📈 Total records created: {total_objects}")
        print("\n🎉 Database now has basic sample data!")
        print("\n🔗 Ready for API testing and development!")
        
        # Print some sample queries users can run
        print("\n📋 Sample queries to explore the data:")
        print("  SELECT name, email FROM users;")
        print("  SELECT name, slug FROM organizations;")
        print("  SELECT name, description FROM teams;")
        
    except Exception as e:
        logger.error(f"❌ Basic sample data generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(main())