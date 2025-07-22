#!/usr/bin/env python3
"""
Simple Sample Data Generator for OpsSight DevOps Platform
Creates basic development data without complex relationships.
"""

import asyncio
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json

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


async def create_sample_data():
    """Create sample data using direct SQL to avoid model relationship issues."""
    logger.info("🌱 Creating sample data with direct SQL...")
    
    async with async_engine.begin() as conn:
        
        # 1. Create Organizations
        logger.info("🏢 Creating organizations...")
        await conn.execute(text("""
            INSERT INTO organizations (name, slug, display_name, description, website, contact_email, 
                                     timezone, currency, date_format, is_active, is_verified, subscription_tier, 
                                     max_users, max_projects, max_clusters, storage_limit_gb, settings)
            VALUES 
                ('TechCorp Solutions', 'techcorp', 'TechCorp Solutions Inc.', 
                 'Leading technology solutions provider', 'https://techcorp.com', 'contact@techcorp.com',
                 'America/Los_Angeles', 'USD', 'YYYY-MM-DD', true, true, 'enterprise', 100, 50, 20, 100,
                 '{"features": ["rbac", "monitoring"], "security": {"require_2fa": true}}'),
                ('StartupXYZ', 'startupxyz', 'StartupXYZ', 
                 'Fast-growing AI startup', 'https://startupxyz.io', 'hello@startupxyz.io',
                 'America/Chicago', 'USD', 'YYYY-MM-DD', true, false, 'professional', 25, 15, 10, 50,
                 '{"features": ["basic_monitoring"], "security": {"require_2fa": false}}')
        """))
        
        # 2. Create Roles
        logger.info("👤 Creating roles...")
        await conn.execute(text("""
            INSERT INTO roles (organization_id, name, display_name, description, is_default, is_system_role, priority)
            SELECT o.id, r.name::systemrole, r.display_name, r.description, r.is_default, r.is_system_role, r.priority
            FROM organizations o
            CROSS JOIN (VALUES
                ('org_owner', 'Organization Owner', 'Full organization administration access', false, false, 100),
                ('devops_admin', 'DevOps Administrator', 'DevOps operations and deployment access', true, false, 80),
                ('engineer', 'Engineer', 'Engineering access with operational capabilities', false, false, 60),
                ('viewer', 'Viewer', 'Read-only access', false, false, 20)
            ) r(name, display_name, description, is_default, is_system_role, priority)
        """))
        
        # 3. Create Users
        logger.info("👥 Creating users...")
        await conn.execute(text("""
            INSERT INTO users (organization_id, github_id, github_username, email, full_name, 
                              avatar_url, github_url, bio, location, company, is_active, last_login_at)
            VALUES 
                ((SELECT id FROM organizations WHERE slug = 'techcorp'), '12345678', 'alice_smith', 
                 'alice.smith@techcorp.com', 'Alice Smith', 
                 'https://avatars.githubusercontent.com/u/12345678?v=4', 'https://github.com/alice_smith',
                 'Senior DevOps Engineer with 8+ years experience', 'San Francisco, CA', 'TechCorp Solutions',
                 true, NOW() - INTERVAL '2 hours'),
                ((SELECT id FROM organizations WHERE slug = 'techcorp'), '23456789', 'bob_wilson',
                 'bob.wilson@techcorp.com', 'Bob Wilson',
                 'https://avatars.githubusercontent.com/u/23456789?v=4', 'https://github.com/bob_wilson',
                 'Platform Engineer specializing in Kubernetes', 'Seattle, WA', 'TechCorp Solutions',
                 true, NOW() - INTERVAL '1 hour'),
                ((SELECT id FROM organizations WHERE slug = 'startupxyz'), '34567890', 'charlie_brown',
                 'charlie.brown@startupxyz.io', 'Charlie Brown',
                 'https://avatars.githubusercontent.com/u/34567890?v=4', 'https://github.com/charlie_brown',
                 'Full-stack developer with DevOps interests', 'Austin, TX', 'StartupXYZ',
                 true, NOW() - INTERVAL '30 minutes'),
                ((SELECT id FROM organizations WHERE slug = 'techcorp'), '45678901', 'diana_martinez',
                 'diana.martinez@techcorp.com', 'Diana Martinez',
                 'https://avatars.githubusercontent.com/u/45678901?v=4', 'https://github.com/diana_martinez',
                 'Site Reliability Engineer', 'New York, NY', 'TechCorp Solutions',
                 true, NOW() - INTERVAL '1 day')
        """))
        
        # 4. Assign Roles to Users
        logger.info("🔗 Assigning roles to users...")
        await conn.execute(text("""
            INSERT INTO user_roles (user_id, role_id, granted_at)
            SELECT u.id, r.id, NOW() - INTERVAL '30 days'
            FROM users u
            JOIN organizations o ON u.organization_id = o.id
            JOIN roles r ON r.organization_id = o.id
            WHERE 
                (u.github_username = 'alice_smith' AND r.name IN ('org_owner'::systemrole, 'devops_admin'::systemrole)) OR
                (u.github_username = 'bob_wilson' AND r.name = 'devops_admin'::systemrole) OR
                (u.github_username = 'charlie_brown' AND r.name = 'engineer'::systemrole) OR
                (u.github_username = 'diana_martinez' AND r.name = 'devops_admin'::systemrole)
        """))
        
        # 5. Create Teams
        logger.info("👥 Creating teams...")
        await conn.execute(text("""
            INSERT INTO teams (organization_id, name, slug, description, is_default, settings)
            SELECT o.id, t.name, t.slug, t.description, t.is_default, t.settings
            FROM organizations o
            CROSS JOIN (VALUES
                ('Platform Engineering', 'platform-engineering', 
                 'Core platform infrastructure team', true,
                 '{"notification_channels": ["slack", "email"], "default_environment": "production"}'),
                ('DevOps Automation', 'devops-automation',
                 'Automation specialists for infrastructure as code', false,
                 '{"notification_channels": ["slack"], "default_environment": "staging"}'),
                ('Application Development', 'app-development',
                 'Application developers', false,
                 '{"notification_channels": ["email"], "default_environment": "development"}')
            ) t(name, slug, description, is_default, settings)
        """))
        
        # 6. Create Team Memberships
        logger.info("🤝 Creating team memberships...")
        await conn.execute(text("""
            INSERT INTO team_memberships (team_id, user_id, role, joined_at)
            SELECT t.id, u.id, 
                   CASE 
                       WHEN u.github_username = 'alice_smith' THEN 'owner'::team_role
                       WHEN u.github_username = 'bob_wilson' THEN 'admin'::team_role
                       ELSE 'member'::team_role
                   END,
                   NOW() - INTERVAL '60 days'
            FROM teams t
            JOIN organizations o ON t.organization_id = o.id
            JOIN users u ON u.organization_id = o.id
            WHERE 
                (t.name = 'Platform Engineering') OR
                (t.name = 'DevOps Automation' AND u.github_username IN ('alice_smith', 'bob_wilson', 'diana_martinez')) OR
                (t.name = 'Application Development' AND u.github_username = 'charlie_brown')
        """))
        
        # 7. Create Projects
        logger.info("🚀 Creating projects...")
        await conn.execute(text("""
            INSERT INTO projects (organization_id, team_id, created_by_user_id, name, slug, display_name, description, 
                                 repository_url, repository_provider, default_branch, is_active, settings)
            SELECT o.id, t.id, u.id, p.name, p.slug, p.display_name, p.description, p.repository_url,
                   p.repository_provider, p.default_branch, p.is_active, p.settings
            FROM organizations o
            JOIN teams t ON t.organization_id = o.id AND t.name = 'Platform Engineering'
            JOIN users u ON u.organization_id = o.id AND u.github_username = 'alice_smith'
            CROSS JOIN (VALUES
                ('E-commerce Platform', 'ecommerce-platform', 'E-commerce Platform',
                 'Main e-commerce application with microservices architecture',
                 'https://github.com/company/ecommerce-platform', 'github', 'main', true,
                 '{"environments": ["development", "staging", "production"], "auto_deploy": true}'),
                ('Analytics Dashboard', 'analytics-dashboard', 'Real-time Analytics Dashboard',
                 'Real-time analytics and reporting dashboard',
                 'https://github.com/company/analytics-dashboard', 'github', 'main', true,
                 '{"environments": ["development", "production"], "auto_deploy": false}')
            ) p(name, slug, display_name, description, repository_url, repository_provider, 
                default_branch, is_active, settings)
        """))
        
        # 8. Create Pipelines
        logger.info("🔄 Creating pipelines...")
        await conn.execute(text("""
            INSERT INTO pipelines (project_id, name, description, workflow_path, is_active, github_actions_config)
            SELECT p.id, pi.name, pi.description, pi.workflow_path, pi.is_active, pi.config
            FROM projects p
            CROSS JOIN (VALUES
                ('CI/CD Pipeline', 'Main CI/CD pipeline', '.github/workflows/ci-cd.yml', true,
                 '{"workflow_id": "ci-cd.yml", "environments": ["staging", "production"]}'),
                ('Security Scan', 'Security vulnerability scanning', '.github/workflows/security.yml', true,
                 '{"workflow_id": "security.yml", "schedule": "0 2 * * *"}')
            ) pi(name, description, workflow_path, is_active, config)
        """))
        
        # 9. Create Pipeline Runs
        logger.info("▶️ Creating pipeline runs...")
        await conn.execute(text("""
            INSERT INTO pipeline_runs (pipeline_id, run_number, status, branch, commit_sha, commit_message,
                                      started_at, finished_at, duration_seconds, triggered_by_user, github_run_id)
            SELECT p.id, 
                   '#' || (100 + generate_series(1, 5))::text,
                   CASE (generate_series(1, 5) % 3)
                       WHEN 0 THEN 'success'::pipeline_status
                       WHEN 1 THEN 'failed'::pipeline_status
                       ELSE 'running'::pipeline_status
                   END,
                   CASE (generate_series(1, 5) % 2) WHEN 0 THEN 'main' ELSE 'develop' END,
                   'abc123' || lpad((generate_series(1, 5))::text, 4, '0'),
                   'feat: implement feature ' || generate_series(1, 5),
                   NOW() - INTERVAL '1 hour' * generate_series(1, 5),
                   CASE WHEN (generate_series(1, 5) % 3) != 2 
                        THEN NOW() - INTERVAL '1 hour' * generate_series(1, 5) + INTERVAL '15 minutes'
                        ELSE NULL END,
                   CASE WHEN (generate_series(1, 5) % 3) != 2 THEN 900 ELSE NULL END,
                   'alice_smith',
                   1234560 + generate_series(1, 5)
            FROM pipelines p
            WHERE p.name = 'CI/CD Pipeline'
        """))
        
        # 10. Create Clusters
        logger.info("☸️ Creating Kubernetes clusters...")
        await conn.execute(text("""
            INSERT INTO clusters (project_id, name, description, endpoint, version, region, 
                                 environment, status, node_count, total_cpu_cores, total_memory_gb, 
                                 total_storage_gb, kubernetes_config)
            SELECT p.id, 
                   p.slug || '-cluster',
                   'Production Kubernetes cluster for ' || p.name,
                   'https://k8s-api-' || p.slug || '.example.com',
                   '1.28.0',
                   'us-west-2',
                   'production',
                   'healthy'::cluster_status,
                   5, 20, 80, 500,
                   '{"namespace": "' || p.slug || '", "ingress_class": "nginx"}'
            FROM projects p
        """))
        
        # 11. Create Alerts
        logger.info("🚨 Creating alerts...")
        await conn.execute(text("""
            INSERT INTO alerts (project_id, title, message, severity, status, source, channel, created_at)
            SELECT p.id, a.title, a.message, a.severity, a.status, a.source, a.channel, a.created_at
            FROM projects p
            CROSS JOIN (VALUES
                ('High CPU Usage Alert', 'CPU usage is above 80% on production cluster', 
                 'warning'::alert_severity, 'acknowledged'::alert_status, 'Prometheus', 'slack', NOW() - INTERVAL '2 hours'),
                ('Deployment Successful', 'Production deployment completed successfully',
                 'info'::alert_severity, 'resolved'::alert_status, 'GitHub Actions', 'email', NOW() - INTERVAL '1 hour'),
                ('Memory Usage Critical', 'Memory usage critical on database server',
                 'critical'::alert_severity, 'active'::alert_status, 'Prometheus', 'slack', NOW() - INTERVAL '30 minutes')
            ) a(title, message, severity, status, source, channel, created_at)
            LIMIT 6  -- 2 projects * 3 alerts each
        """))
        
        logger.info("✅ Sample data creation completed successfully!")


async def get_data_summary():
    """Get summary of created data."""
    logger.info("📊 Generating data summary...")
    
    async with async_engine.begin() as conn:
        
        # Count records in each table
        tables = [
            'organizations', 'roles', 'users', 'user_roles', 'teams', 
            'team_memberships', 'projects', 'pipelines', 'pipeline_runs', 
            'clusters', 'alerts'
        ]
        
        summary = {}
        for table in tables:
            result = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            summary[table] = count
        
        return summary


async def main():
    """Main function to run sample data generation."""
    logger.info("🚀 Initializing simple sample data generation...")
    
    try:
        # Create sample data
        await create_sample_data()
        
        # Get summary
        summary = await get_data_summary()
        
        logger.info("✅ Sample data generation completed successfully!")
        
        # Print summary
        print("\n🌱 Sample Data Generation Summary:")
        print("=" * 50)
        total_objects = 0
        for table, count in summary.items():
            if count > 0:
                print(f"  📊 {table.replace('_', ' ').title()}: {count}")
                total_objects += count
        
        print(f"\n📈 Total records created: {total_objects}")
        print("\n🎉 Database is now populated with realistic development data!")
        print("\n🔗 Ready for frontend-backend integration testing!")
        
        # Print some sample queries users can run
        print("\n📋 Sample queries to explore the data:")
        print("  SELECT name, email FROM users;")
        print("  SELECT p.name, t.name as team FROM projects p JOIN teams t ON p.team_id = t.id;")
        print("  SELECT title, severity, status FROM alerts ORDER BY created_at DESC;")
        
    except Exception as e:
        logger.error(f"❌ Sample data generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(main())