#!/usr/bin/env python3
"""
Engineering Intelligence System - Typo.app Replica
SDLC Visibility, Developer Productivity, and Code Quality Analytics
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging
import random
import hashlib
from enum import Enum

class PullRequestStatus(Enum):
    """Pull request status"""
    OPEN = "open"
    MERGED = "merged"
    CLOSED = "closed"
    DRAFT = "draft"

class ReviewStatus(Enum):
    """Code review status"""
    PENDING = "pending"
    APPROVED = "approved"
    CHANGES_REQUESTED = "changes_requested"
    COMMENTED = "commented"

@dataclass
class Developer:
    """Developer profile"""
    id: str
    username: str
    email: str
    full_name: str
    team: str
    role: str
    join_date: datetime
    avatar_url: str = None
    timezone: str = "UTC"
    skills: List[str] = None

@dataclass
class PullRequest:
    """Pull request data"""
    id: str
    title: str
    description: str
    author: str
    status: PullRequestStatus
    created_at: datetime
    updated_at: datetime
    merged_at: Optional[datetime]
    closed_at: Optional[datetime]
    repository: str
    branch_from: str
    branch_to: str
    lines_added: int
    lines_removed: int
    files_changed: int
    commits_count: int
    review_requests: List[str]
    reviews: List[Dict[str, Any]]
    labels: List[str] = None
    milestone: str = None

@dataclass
class CodeReview:
    """Code review data"""
    id: str
    pr_id: str
    reviewer: str
    status: ReviewStatus
    created_at: datetime
    completed_at: Optional[datetime]
    comments_count: int
    suggestions_count: int
    security_issues: int
    quality_score: float
    ai_summary: str = None

class EngineeringIntelligenceService:
    """Main engineering intelligence service - Typo replica"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Generate mock data
        self.developers = self._generate_mock_developers()
        self.repositories = self._generate_mock_repositories()
        self.pull_requests = self._generate_mock_pull_requests()
        self.code_reviews = self._generate_mock_code_reviews()
        self.commits = self._generate_mock_commits()
        
    def _generate_mock_developers(self) -> List[Developer]:
        """Generate mock developer profiles"""
        developers = []
        
        dev_data = [
            {"username": "sarah_chen", "name": "Sarah Chen", "team": "Frontend", "role": "Senior Developer"},
            {"username": "mike_johnson", "name": "Mike Johnson", "team": "Backend", "role": "Tech Lead"},
            {"username": "alex_kumar", "name": "Alex Kumar", "team": "DevOps", "role": "Platform Engineer"},
            {"username": "emily_davis", "name": "Emily Davis", "team": "Frontend", "role": "Developer"},
            {"username": "james_wilson", "name": "James Wilson", "team": "Backend", "role": "Senior Developer"},
            {"username": "lisa_brown", "name": "Lisa Brown", "team": "QA", "role": "QA Engineer"},
            {"username": "david_garcia", "name": "David Garcia", "team": "DevOps", "role": "SRE"},
            {"username": "anna_lee", "name": "Anna Lee", "team": "Frontend", "role": "UI/UX Developer"},
        ]
        
        for i, dev in enumerate(dev_data):
            developers.append(Developer(
                id=f"dev_{i+1:03d}",
                username=dev["username"],
                email=f"{dev['username']}@opssight.dev",
                full_name=dev["name"],
                team=dev["team"],
                role=dev["role"],
                join_date=datetime.utcnow() - timedelta(days=random.randint(30, 365)),
                avatar_url=f"https://avatars.githubusercontent.com/{dev['username']}",
                skills=random.sample(["React", "Python", "Kubernetes", "AWS", "TypeScript", "Docker", "GraphQL"], k=random.randint(3, 5))
            ))
        
        return developers
    
    def _generate_mock_repositories(self) -> List[Dict[str, Any]]:
        """Generate mock repository data"""
        return [
            {
                "id": "repo_001",
                "name": "opssight-frontend",
                "description": "OpsSight Platform Frontend Application",
                "language": "TypeScript",
                "stars": 45,
                "forks": 12,
                "contributors": 6,
                "last_commit": datetime.utcnow() - timedelta(hours=2),
                "health_score": 92.5
            },
            {
                "id": "repo_002", 
                "name": "opssight-backend",
                "description": "OpsSight Platform Backend API",
                "language": "Python",
                "stars": 38,
                "forks": 8,
                "contributors": 5,
                "last_commit": datetime.utcnow() - timedelta(hours=1),
                "health_score": 88.3
            },
            {
                "id": "repo_003",
                "name": "opssight-infrastructure",
                "description": "Infrastructure as Code and Deployment Scripts",
                "language": "YAML",
                "stars": 23,
                "forks": 15,
                "contributors": 4,
                "last_commit": datetime.utcnow() - timedelta(hours=6),
                "health_score": 95.1
            }
        ]
    
    def _generate_mock_pull_requests(self) -> List[PullRequest]:
        """Generate mock pull request data"""
        pull_requests = []
        
        pr_titles = [
            "Add real-time metrics dashboard",
            "Implement Kubernetes monitoring integration", 
            "Fix authentication token expiration bug",
            "Update CI/CD pipeline configuration",
            "Add unit tests for alert system",
            "Refactor database connection handling",
            "Implement responsive design for mobile",
            "Add error boundary for React components",
            "Optimize database query performance",
            "Update Docker configuration for production"
        ]
        
        for i in range(25):  # Generate 25 PRs
            created_date = datetime.utcnow() - timedelta(days=random.randint(0, 30))
            is_merged = random.choice([True, True, True, False])  # 75% merged
            
            if is_merged:
                merged_date = created_date + timedelta(hours=random.randint(2, 72))
                status = PullRequestStatus.MERGED
                closed_date = merged_date
            else:
                merged_date = None
                closed_date = None
                status = random.choice([PullRequestStatus.OPEN, PullRequestStatus.CLOSED])
            
            pr = PullRequest(
                id=f"pr_{i+1:03d}",
                title=random.choice(pr_titles),
                description=f"This PR implements {random.choice(['feature', 'bugfix', 'enhancement', 'refactoring'])} to improve system {random.choice(['performance', 'reliability', 'security', 'usability'])}.",
                author=random.choice(self.developers).username,
                status=status,
                created_at=created_date,
                updated_at=created_date + timedelta(hours=random.randint(1, 48)),
                merged_at=merged_date,
                closed_at=closed_date,
                repository=random.choice(self.repositories)["name"],
                branch_from=f"feature/task-{i+1}",
                branch_to="main",
                lines_added=random.randint(10, 500),
                lines_removed=random.randint(5, 200),
                files_changed=random.randint(1, 15),
                commits_count=random.randint(1, 8),
                review_requests=[dev.username for dev in random.sample(self.developers, k=random.randint(1, 3))],
                reviews=[],
                labels=random.sample(["bug", "feature", "enhancement", "documentation", "security"], k=random.randint(1, 3))
            )
            pull_requests.append(pr)
        
        return pull_requests
    
    def _generate_mock_code_reviews(self) -> List[CodeReview]:
        """Generate mock code review data"""
        reviews = []
        
        for pr in self.pull_requests:
            # Generate 1-3 reviews per PR
            num_reviews = random.randint(1, 3)
            reviewers = random.sample([d.username for d in self.developers if d.username != pr.author], k=num_reviews)
            
            for reviewer in reviewers:
                review_start = pr.created_at + timedelta(hours=random.randint(1, 24))
                review_complete = review_start + timedelta(hours=random.randint(1, 12))
                
                review = CodeReview(
                    id=f"review_{len(reviews)+1:03d}",
                    pr_id=pr.id,
                    reviewer=reviewer,
                    status=random.choice(list(ReviewStatus)),
                    created_at=review_start,
                    completed_at=review_complete if random.random() > 0.2 else None,
                    comments_count=random.randint(0, 8),
                    suggestions_count=random.randint(0, 5),
                    security_issues=random.randint(0, 2),
                    quality_score=random.uniform(7.0, 9.5),
                    ai_summary=f"Code quality looks good. {random.choice(['Minor suggestions for improvement.', 'Excellent implementation.', 'Consider refactoring for better readability.', 'Security best practices followed.'])}"
                )
                reviews.append(review)
                
                # Add review to PR
                pr.reviews.append({
                    "reviewer": reviewer,
                    "status": review.status.value,
                    "created_at": review.created_at.isoformat(),
                    "comments": review.comments_count
                })
        
        return reviews
    
    def _generate_mock_commits(self) -> List[Dict[str, Any]]:
        """Generate mock commit data"""
        commits = []
        
        commit_messages = [
            "feat: add new authentication system",
            "fix: resolve memory leak in metrics collection",
            "docs: update API documentation",
            "refactor: improve code organization",
            "test: add integration tests",
            "chore: update dependencies",
            "perf: optimize database queries",
            "style: fix code formatting"
        ]
        
        for i in range(100):  # Generate 100 commits
            commit_date = datetime.utcnow() - timedelta(days=random.randint(0, 30))
            
            commits.append({
                "id": f"commit_{i+1:03d}",
                "hash": hashlib.sha1(f"commit_{i}".encode()).hexdigest()[:8],
                "message": random.choice(commit_messages),
                "author": random.choice(self.developers).username,
                "timestamp": commit_date,
                "repository": random.choice(self.repositories)["name"],
                "lines_added": random.randint(1, 100),
                "lines_removed": random.randint(0, 50),
                "files_changed": random.randint(1, 8)
            })
        
        return commits
    
    async def get_sdlc_overview(self) -> Dict[str, Any]:
        """Get SDLC visibility overview - core Typo feature"""
        # Calculate key SDLC metrics
        total_prs = len(self.pull_requests)
        merged_prs = len([pr for pr in self.pull_requests if pr.status == PullRequestStatus.MERGED])
        open_prs = len([pr for pr in self.pull_requests if pr.status == PullRequestStatus.OPEN])
        
        # Calculate cycle times
        cycle_times = []
        for pr in self.pull_requests:
            if pr.merged_at:
                cycle_time = (pr.merged_at - pr.created_at).total_seconds() / 3600  # hours
                cycle_times.append(cycle_time)
        
        avg_cycle_time = sum(cycle_times) / len(cycle_times) if cycle_times else 0
        
        # Calculate review metrics
        avg_review_time = sum(
            (r.completed_at - r.created_at).total_seconds() / 3600 
            for r in self.code_reviews 
            if r.completed_at
        ) / len([r for r in self.code_reviews if r.completed_at]) if self.code_reviews else 0
        
        # Developer productivity
        commits_last_week = len([c for c in self.commits if c["timestamp"] > datetime.utcnow() - timedelta(days=7)])
        
        return {
            "delivery_metrics": {
                "total_pull_requests": total_prs,
                "merged_pull_requests": merged_prs,
                "open_pull_requests": open_prs,
                "merge_rate": round((merged_prs / total_prs) * 100, 1) if total_prs > 0 else 0,
                "average_cycle_time_hours": round(avg_cycle_time, 1),
                "average_review_time_hours": round(avg_review_time, 1)
            },
            "productivity_insights": {
                "commits_this_week": commits_last_week,
                "active_developers": len(self.developers),
                "code_quality_score": round(sum(r.quality_score for r in self.code_reviews) / len(self.code_reviews), 1) if self.code_reviews else 0,
                "security_issues_found": sum(r.security_issues for r in self.code_reviews)
            },
            "repository_health": {
                "total_repositories": len(self.repositories),
                "average_health_score": round(sum(r["health_score"] for r in self.repositories) / len(self.repositories), 1),
                "total_contributors": sum(r["contributors"] for r in self.repositories)
            },
            "trends": {
                "cycle_time_trend": "improving",  # Would be calculated from historical data
                "merge_rate_trend": "stable",
                "quality_trend": "improving"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_team_performance(self) -> Dict[str, Any]:
        """Get team performance analytics - Typo feature"""
        # Group developers by team
        teams = {}
        for dev in self.developers:
            if dev.team not in teams:
                teams[dev.team] = []
            teams[dev.team].append(dev)
        
        team_metrics = {}
        for team_name, team_devs in teams.items():
            team_usernames = [dev.username for dev in team_devs]
            
            # Calculate team metrics
            team_prs = [pr for pr in self.pull_requests if pr.author in team_usernames]
            team_commits = [c for c in self.commits if c["author"] in team_usernames]
            team_reviews = [r for r in self.code_reviews if r.reviewer in team_usernames]
            
            # Performance calculations
            merged_prs = len([pr for pr in team_prs if pr.status == PullRequestStatus.MERGED])
            avg_pr_size = sum(pr.lines_added + pr.lines_removed for pr in team_prs) / len(team_prs) if team_prs else 0
            
            team_metrics[team_name] = {
                "team_size": len(team_devs),
                "pull_requests": len(team_prs),
                "merged_prs": merged_prs,
                "commits": len(team_commits),
                "code_reviews": len(team_reviews),
                "merge_rate": round((merged_prs / len(team_prs)) * 100, 1) if team_prs else 0,
                "avg_pr_size": round(avg_pr_size, 1),
                "productivity_score": round(random.uniform(7.5, 9.2), 1),  # Would be calculated based on actual metrics
                "velocity_trend": random.choice(["up", "stable", "down"]),
                "members": [{"username": dev.username, "role": dev.role} for dev in team_devs]
            }
        
        return {
            "teams": team_metrics,
            "overall_performance": {
                "total_teams": len(teams),
                "total_developers": len(self.developers),
                "average_productivity": round(sum(tm["productivity_score"] for tm in team_metrics.values()) / len(team_metrics), 1),
                "top_performing_team": max(team_metrics.keys(), key=lambda t: team_metrics[t]["productivity_score"]),
                "improvement_areas": ["Code review time", "PR size optimization", "Documentation coverage"]
            },
            "collaboration_metrics": {
                "cross_team_reviews": len([r for r in self.code_reviews if self._get_dev_team(r.reviewer) != self._get_pr_author_team(r.pr_id)]),
                "knowledge_sharing_score": round(random.uniform(6.8, 8.5), 1),
                "mentorship_activities": random.randint(12, 28)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _get_dev_team(self, username: str) -> str:
        """Get developer's team"""
        for dev in self.developers:
            if dev.username == username:
                return dev.team
        return "Unknown"
    
    def _get_pr_author_team(self, pr_id: str) -> str:
        """Get PR author's team"""
        for pr in self.pull_requests:
            if pr.id == pr_id:
                return self._get_dev_team(pr.author)
        return "Unknown"
    
    async def get_dora_metrics(self) -> Dict[str, Any]:
        """Get DORA metrics - key Typo feature"""
        # Lead Time for Changes
        lead_times = []
        for pr in self.pull_requests:
            if pr.merged_at:
                lead_time = (pr.merged_at - pr.created_at).total_seconds() / 3600  # hours
                lead_times.append(lead_time)
        
        avg_lead_time = sum(lead_times) / len(lead_times) if lead_times else 0
        
        # Deployment Frequency (mock data)
        deployments_last_week = random.randint(8, 15)
        deployment_frequency = deployments_last_week / 7  # per day
        
        # Mean Time to Recovery (MTTR) - mock calculation
        mttr_hours = random.uniform(2.5, 8.0)
        
        # Change Failure Rate
        total_deployments = random.randint(45, 65)
        failed_deployments = random.randint(2, 6)
        change_failure_rate = (failed_deployments / total_deployments) * 100
        
        return {
            "lead_time_for_changes": {
                "value_hours": round(avg_lead_time, 1),
                "value_days": round(avg_lead_time / 24, 1),
                "trend": "improving",
                "benchmark": "Industry Average: 3.2 days",
                "performance_tier": "High" if avg_lead_time < 48 else "Medium" if avg_lead_time < 168 else "Low"
            },
            "deployment_frequency": {
                "value_per_day": round(deployment_frequency, 1),
                "value_per_week": deployments_last_week,
                "trend": "stable",
                "benchmark": "Industry Average: 1.8/day",
                "performance_tier": "High" if deployment_frequency > 1 else "Medium" if deployment_frequency > 0.5 else "Low"
            },
            "mean_time_to_recovery": {
                "value_hours": round(mttr_hours, 1),
                "trend": "improving",
                "benchmark": "Industry Average: 4.2 hours",
                "performance_tier": "High" if mttr_hours < 4 else "Medium" if mttr_hours < 12 else "Low"
            },
            "change_failure_rate": {
                "value_percentage": round(change_failure_rate, 1),
                "failed_deployments": failed_deployments,
                "total_deployments": total_deployments,
                "trend": "stable",
                "benchmark": "Industry Average: 12%",
                "performance_tier": "High" if change_failure_rate < 10 else "Medium" if change_failure_rate < 20 else "Low"
            },
            "overall_dora_score": {
                "score": round(random.uniform(7.2, 8.8), 1),
                "grade": "A",
                "improvement_recommendations": [
                    "Reduce PR review time to improve lead time",
                    "Implement automated testing to reduce failure rate",
                    "Enhance monitoring to improve MTTR"
                ]
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_code_quality_insights(self) -> Dict[str, Any]:
        """Get code quality insights - AI-powered like Typo"""
        # Analyze code reviews for quality metrics
        total_reviews = len(self.code_reviews)
        avg_quality_score = sum(r.quality_score for r in self.code_reviews) / total_reviews if total_reviews else 0
        total_security_issues = sum(r.security_issues for r in self.code_reviews)
        
        # PR size analysis
        pr_sizes = [pr.lines_added + pr.lines_removed for pr in self.pull_requests]
        avg_pr_size = sum(pr_sizes) / len(pr_sizes) if pr_sizes else 0
        large_prs = len([pr for pr in self.pull_requests if (pr.lines_added + pr.lines_removed) > 500])
        
        # Review coverage
        reviewed_prs = len([pr for pr in self.pull_requests if pr.reviews])
        review_coverage = (reviewed_prs / len(self.pull_requests)) * 100 if self.pull_requests else 0
        
        return {
            "quality_metrics": {
                "average_quality_score": round(avg_quality_score, 1),
                "total_security_issues": total_security_issues,
                "code_review_coverage": round(review_coverage, 1),
                "average_pr_size": round(avg_pr_size, 0),
                "large_prs_count": large_prs,
                "large_prs_percentage": round((large_prs / len(self.pull_requests)) * 100, 1) if self.pull_requests else 0
            },
            "ai_insights": [
                {
                    "type": "recommendation",
                    "priority": "high",
                    "title": "Optimize PR Size",
                    "description": f"Consider breaking down large PRs. {large_prs} PRs exceed 500 lines.",
                    "impact": "Reduces review time and improves code quality"
                },
                {
                    "type": "security",
                    "priority": "medium",
                    "title": "Security Review",
                    "description": f"Found {total_security_issues} security issues across recent reviews.",
                    "impact": "Enhances application security posture"
                },
                {
                    "type": "process",
                    "priority": "low",
                    "title": "Review Coverage",
                    "description": f"Current review coverage is {review_coverage:.1f}%. Consider mandatory reviews.",
                    "impact": "Improves overall code quality and knowledge sharing"
                }
            ],
            "quality_trends": {
                "quality_score_trend": "improving",
                "security_issues_trend": "stable",
                "review_coverage_trend": "improving",
                "pr_size_trend": "stable"
            },
            "benchmarks": {
                "industry_avg_quality_score": 7.8,
                "industry_avg_review_coverage": 85.0,
                "recommended_pr_size": 250
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_developer_experience(self) -> Dict[str, Any]:
        """Get developer experience insights - Typo DevEx feature"""
        # Mock developer satisfaction survey data
        satisfaction_scores = {
            "development_tools": random.uniform(7.2, 8.5),
            "code_review_process": random.uniform(6.8, 8.2),
            "deployment_pipeline": random.uniform(7.5, 8.8),
            "documentation_quality": random.uniform(6.5, 7.9),
            "team_collaboration": random.uniform(7.8, 9.1),
            "learning_opportunities": random.uniform(7.0, 8.3)
        }
        
        # Calculate individual developer metrics
        dev_metrics = {}
        for dev in self.developers:
            dev_prs = [pr for pr in self.pull_requests if pr.author == dev.username]
            dev_reviews = [r for r in self.code_reviews if r.reviewer == dev.username]
            dev_commits = [c for c in self.commits if c["author"] == dev.username]
            
            # Productivity score calculation
            productivity_factors = {
                "commit_frequency": len(dev_commits) / 30,  # commits per day
                "pr_merge_rate": len([pr for pr in dev_prs if pr.status == PullRequestStatus.MERGED]) / len(dev_prs) if dev_prs else 0,
                "review_participation": len(dev_reviews) / 30,  # reviews per day
                "code_quality": sum(r.quality_score for r in dev_reviews if r.reviewer == dev.username) / len(dev_reviews) if dev_reviews else 8.0
            }
            
            productivity_score = (
                productivity_factors["commit_frequency"] * 2 +
                productivity_factors["pr_merge_rate"] * 3 +
                productivity_factors["review_participation"] * 1.5 +
                productivity_factors["code_quality"]
            ) / 7.5 * 10
            
            dev_metrics[dev.username] = {
                "full_name": dev.full_name,
                "team": dev.team,
                "role": dev.role,
                "productivity_score": round(min(productivity_score, 10), 1),
                "commits_count": len(dev_commits),
                "prs_count": len(dev_prs),
                "reviews_count": len(dev_reviews),
                "satisfaction_score": round(random.uniform(7.0, 9.0), 1),
                "blockers": random.sample([
                    "Slow CI/CD pipeline",
                    "Complex deployment process",
                    "Insufficient documentation",
                    "Code review bottlenecks",
                    "Environment setup issues"
                ], k=random.randint(0, 2))
            }
        
        return {
            "satisfaction_metrics": satisfaction_scores,
            "overall_satisfaction": round(sum(satisfaction_scores.values()) / len(satisfaction_scores), 1),
            "developer_metrics": dev_metrics,
            "productivity_insights": {
                "high_performers": [dev for dev, metrics in dev_metrics.items() if metrics["productivity_score"] >= 8.0],
                "needs_support": [dev for dev, metrics in dev_metrics.items() if metrics["productivity_score"] < 6.0],
                "average_productivity": round(sum(metrics["productivity_score"] for metrics in dev_metrics.values()) / len(dev_metrics), 1)
            },
            "friction_points": [
                {
                    "area": "Development Environment",
                    "impact_score": 7.2,
                    "affected_developers": random.randint(3, 6),
                    "description": "Local development setup complexity"
                },
                {
                    "area": "Code Review Process",
                    "impact_score": 6.8,
                    "affected_developers": random.randint(2, 4),
                    "description": "Long review wait times"
                },
                {
                    "area": "Documentation",
                    "impact_score": 6.5,
                    "affected_developers": random.randint(4, 7),
                    "description": "Outdated or missing documentation"
                }
            ],
            "recommendations": [
                "Streamline development environment setup with Docker",
                "Implement automated code review assignments",
                "Create developer onboarding documentation",
                "Introduce pair programming sessions",
                "Set up developer feedback collection system"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }

# Create global instance
engineering_intel = EngineeringIntelligenceService()

if __name__ == "__main__":
    # Test engineering intelligence features
    async def test_engineering_intelligence():
        print("🧠 Testing Engineering Intelligence System (Typo Replica)")
        print("=" * 60)
        
        # Test SDLC overview
        sdlc = await engineering_intel.get_sdlc_overview()
        print(f"✅ SDLC Overview:")
        print(f"   • Pull Requests: {sdlc['delivery_metrics']['total_pull_requests']}")
        print(f"   • Merge Rate: {sdlc['delivery_metrics']['merge_rate']}%")
        print(f"   • Cycle Time: {sdlc['delivery_metrics']['average_cycle_time_hours']} hours")
        print(f"   • Quality Score: {sdlc['productivity_insights']['code_quality_score']}")
        print()
        
        # Test team performance
        team_perf = await engineering_intel.get_team_performance()
        print(f"✅ Team Performance:")
        print(f"   • Total Teams: {team_perf['overall_performance']['total_teams']}")
        print(f"   • Average Productivity: {team_perf['overall_performance']['average_productivity']}")
        print(f"   • Top Team: {team_perf['overall_performance']['top_performing_team']}")
        print()
        
        # Test DORA metrics
        dora = await engineering_intel.get_dora_metrics()
        print(f"✅ DORA Metrics:")
        print(f"   • Lead Time: {dora['lead_time_for_changes']['value_days']} days")
        print(f"   • Deploy Frequency: {dora['deployment_frequency']['value_per_day']}/day")
        print(f"   • MTTR: {dora['mean_time_to_recovery']['value_hours']} hours")
        print(f"   • Failure Rate: {dora['change_failure_rate']['value_percentage']}%")
        print()
        
        # Test code quality
        quality = await engineering_intel.get_code_quality_insights()
        print(f"✅ Code Quality:")
        print(f"   • Quality Score: {quality['quality_metrics']['average_quality_score']}")
        print(f"   • Review Coverage: {quality['quality_metrics']['code_review_coverage']}%")
        print(f"   • Security Issues: {quality['quality_metrics']['total_security_issues']}")
        print()
        
        # Test developer experience
        devex = await engineering_intel.get_developer_experience()
        print(f"✅ Developer Experience:")
        print(f"   • Overall Satisfaction: {devex['overall_satisfaction']}")
        print(f"   • High Performers: {len(devex['productivity_insights']['high_performers'])}")
        print(f"   • Friction Points: {len(devex['friction_points'])}")
        
        print("\n✅ Engineering Intelligence system test completed!")
    
    asyncio.run(test_engineering_intelligence())