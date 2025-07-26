#!/usr/bin/env python3
"""
Git Platform Analytics - GitHub/GitLab Integration
Advanced Git analytics, code contribution patterns, and repository insights
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

class GitPlatform(Enum):
    """Git platform types"""
    GITHUB = "github"
    GITLAB = "gitlab"
    BITBUCKET = "bitbucket"

class ContributionType(Enum):
    """Types of contributions"""
    COMMITS = "commits"
    PULL_REQUESTS = "pull_requests"
    ISSUES = "issues"
    CODE_REVIEWS = "code_reviews"
    COMMENTS = "comments"

@dataclass
class GitRepository:
    """Git repository data"""
    id: str
    name: str
    full_name: str
    platform: GitPlatform
    language: str
    stars: int
    forks: int
    contributors: int
    open_issues: int
    last_commit: datetime
    created_at: datetime
    size_kb: int
    license: Optional[str] = None
    default_branch: str = "main"
    is_private: bool = False

@dataclass
class GitCommit:
    """Git commit data"""
    id: str
    sha: str
    message: str
    author: str
    author_email: str
    timestamp: datetime
    repository: str
    branch: str
    additions: int
    deletions: int
    changed_files: int
    parents: List[str]
    verified: bool = False

@dataclass
class GitContributor:
    """Git contributor statistics"""
    username: str
    email: str
    full_name: str
    commits: int
    additions: int
    deletions: int
    pull_requests: int
    issues: int
    code_reviews: int
    first_contribution: datetime
    last_contribution: datetime
    repositories: List[str]
    languages: List[str]
    avatar_url: Optional[str] = None

class GitAnalyticsService:
    """Git platform analytics service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Generate mock data
        self.repositories = self._generate_mock_repositories()
        self.commits = self._generate_mock_commits()
        self.contributors = self._generate_mock_contributors()
        self.pull_requests = self._generate_mock_pull_requests()
        
    def _generate_mock_repositories(self) -> List[GitRepository]:
        """Generate mock repository data"""
        repositories = []
        
        repo_data = [
            {
                "name": "opssight-frontend",
                "full_name": "opssight/opssight-frontend",
                "language": "TypeScript",
                "stars": 45,
                "forks": 12,
                "contributors": 6,
                "open_issues": 8,
                "size_kb": 15420
            },
            {
                "name": "opssight-backend",
                "full_name": "opssight/opssight-backend",
                "language": "Python",
                "stars": 38,
                "forks": 8,
                "contributors": 5,
                "open_issues": 5,
                "size_kb": 8950
            },
            {
                "name": "opssight-infrastructure",
                "full_name": "opssight/opssight-infrastructure",
                "language": "YAML",
                "stars": 23,
                "forks": 15,
                "contributors": 4,
                "open_issues": 3,
                "size_kb": 2340
            },
            {
                "name": "opssight-mobile",
                "full_name": "opssight/opssight-mobile",
                "language": "Dart",
                "stars": 12,
                "forks": 3,
                "contributors": 2,
                "open_issues": 12,
                "size_kb": 4680
            },
            {
                "name": "opssight-docs",
                "full_name": "opssight/opssight-docs",
                "language": "Markdown",
                "stars": 8,
                "forks": 6,
                "contributors": 8,
                "open_issues": 2,
                "size_kb": 890
            }
        ]
        
        for i, repo in enumerate(repo_data):
            repositories.append(GitRepository(
                id=f"repo_{i+1:03d}",
                name=repo["name"],
                full_name=repo["full_name"],
                platform=GitPlatform.GITHUB,
                language=repo["language"],
                stars=repo["stars"],
                forks=repo["forks"],
                contributors=repo["contributors"],
                open_issues=repo["open_issues"],
                last_commit=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                created_at=datetime.utcnow() - timedelta(days=random.randint(30, 365)),
                size_kb=repo["size_kb"],
                license="MIT",
                is_private=random.choice([True, False])
            ))
        
        return repositories
    
    def _generate_mock_commits(self) -> List[GitCommit]:
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
            "style: fix code formatting",
            "ci: update deployment pipeline",
            "security: fix authentication vulnerability"
        ]
        
        authors = [
            ("sarah_chen", "sarah.chen@opssight.dev", "Sarah Chen"),
            ("mike_johnson", "mike.johnson@opssight.dev", "Mike Johnson"),
            ("alex_kumar", "alex.kumar@opssight.dev", "Alex Kumar"),
            ("emily_davis", "emily.davis@opssight.dev", "Emily Davis"),
            ("james_wilson", "james.wilson@opssight.dev", "James Wilson")
        ]
        
        for i in range(200):  # Generate 200 commits
            author = random.choice(authors)
            commit_date = datetime.utcnow() - timedelta(days=random.randint(0, 60))
            
            commits.append(GitCommit(
                id=f"commit_{i+1:03d}",
                sha=hashlib.sha1(f"commit_{i}".encode()).hexdigest(),
                message=random.choice(commit_messages),
                author=author[0],
                author_email=author[1],
                timestamp=commit_date,
                repository=random.choice(self.repositories).name,
                branch=random.choice(["main", "develop", "feature/auth", "hotfix/security"]),
                additions=random.randint(1, 150),
                deletions=random.randint(0, 80),
                changed_files=random.randint(1, 12),
                parents=[hashlib.sha1(f"parent_{i-1}".encode()).hexdigest()],
                verified=random.choice([True, False])
            ))
        
        return commits
    
    def _generate_mock_contributors(self) -> List[GitContributor]:
        """Generate mock contributor data"""
        contributors = []
        
        contributor_data = [
            {
                "username": "sarah_chen",
                "email": "sarah.chen@opssight.dev",
                "full_name": "Sarah Chen",
                "languages": ["TypeScript", "JavaScript", "CSS"]
            },
            {
                "username": "mike_johnson",
                "email": "mike.johnson@opssight.dev",
                "full_name": "Mike Johnson",
                "languages": ["Python", "SQL", "Docker"]
            },
            {
                "username": "alex_kumar",
                "email": "alex.kumar@opssight.dev",
                "full_name": "Alex Kumar",
                "languages": ["YAML", "Bash", "Python"]
            },
            {
                "username": "emily_davis",
                "email": "emily.davis@opssight.dev",
                "full_name": "Emily Davis",
                "languages": ["TypeScript", "React", "Node.js"]
            },
            {
                "username": "james_wilson",
                "email": "james.wilson@opssight.dev",
                "full_name": "James Wilson",
                "languages": ["Python", "FastAPI", "PostgreSQL"]
            }
        ]
        
        for contrib in contributor_data:
            # Calculate contribution stats
            user_commits = [c for c in self.commits if c.author == contrib["username"]]
            
            contributors.append(GitContributor(
                username=contrib["username"],
                email=contrib["email"],
                full_name=contrib["full_name"],
                commits=len(user_commits),
                additions=sum(c.additions for c in user_commits),
                deletions=sum(c.deletions for c in user_commits),
                pull_requests=random.randint(15, 45),
                issues=random.randint(5, 20),
                code_reviews=random.randint(20, 60),
                first_contribution=datetime.utcnow() - timedelta(days=random.randint(180, 365)),
                last_contribution=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                repositories=[repo.name for repo in random.sample(self.repositories, k=random.randint(2, 4))],
                languages=contrib["languages"],
                avatar_url=f"https://avatars.githubusercontent.com/{contrib['username']}"
            ))
        
        return contributors
    
    def _generate_mock_pull_requests(self) -> List[Dict[str, Any]]:
        """Generate mock pull request data"""
        prs = []
        
        pr_titles = [
            "Add user authentication system",
            "Fix performance issues in API",
            "Update documentation",
            "Implement new dashboard features",
            "Security vulnerability fixes",
            "Code refactoring and cleanup",
            "Add unit tests",
            "Update dependencies",
            "UI/UX improvements",
            "Database migration scripts"
        ]
        
        for i in range(50):
            created_date = datetime.utcnow() - timedelta(days=random.randint(0, 30))
            is_merged = random.choice([True, True, True, False])  # 75% merged
            
            prs.append({
                "id": f"pr_{i+1:03d}",
                "number": i + 1,
                "title": random.choice(pr_titles),
                "author": random.choice(self.contributors).username,
                "repository": random.choice(self.repositories).name,
                "created_at": created_date,
                "merged_at": created_date + timedelta(hours=random.randint(2, 72)) if is_merged else None,
                "closed_at": created_date + timedelta(hours=random.randint(2, 72)) if not is_merged else None,
                "additions": random.randint(10, 500),
                "deletions": random.randint(5, 200),
                "changed_files": random.randint(1, 15),
                "commits": random.randint(1, 8),
                "comments": random.randint(0, 12),
                "reviews": random.randint(1, 5),
                "status": "merged" if is_merged else "closed",
                "labels": random.sample(["bug", "feature", "enhancement", "documentation"], k=random.randint(1, 3))
            })
        
        return prs
    
    async def get_repository_analytics(self) -> Dict[str, Any]:
        """Get comprehensive repository analytics"""
        total_repos = len(self.repositories)
        total_stars = sum(repo.stars for repo in self.repositories)
        total_forks = sum(repo.forks for repo in self.repositories)
        total_contributors = sum(repo.contributors for repo in self.repositories)
        
        # Language distribution
        language_stats = {}
        for repo in self.repositories:
            language_stats[repo.language] = language_stats.get(repo.language, 0) + 1
        
        # Repository health scores
        repo_health = []
        for repo in self.repositories:
            # Calculate health score based on activity, issues, etc.
            days_since_commit = (datetime.utcnow() - repo.last_commit).days
            issue_ratio = repo.open_issues / max(repo.contributors, 1)
            
            health_score = 10.0
            health_score -= min(days_since_commit * 0.1, 3.0)  # Penalize old commits
            health_score -= min(issue_ratio * 0.5, 2.0)  # Penalize high issue ratio
            health_score = max(health_score, 0.0)
            
            repo_health.append({
                "repository": repo.name,
                "health_score": round(health_score, 1),
                "last_commit_days": days_since_commit,
                "open_issues": repo.open_issues,
                "contributors": repo.contributors
            })
        
        return {
            "overview": {
                "total_repositories": total_repos,
                "total_stars": total_stars,
                "total_forks": total_forks,
                "total_contributors": total_contributors,
                "average_health_score": round(sum(r["health_score"] for r in repo_health) / len(repo_health), 1)
            },
            "language_distribution": language_stats,
            "repository_health": sorted(repo_health, key=lambda x: x["health_score"], reverse=True),
            "top_repositories": sorted([
                {
                    "name": repo.name,
                    "stars": repo.stars,
                    "language": repo.language,
                    "contributors": repo.contributors
                }
                for repo in self.repositories
            ], key=lambda x: x["stars"], reverse=True)[:5],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_contributor_analytics(self) -> Dict[str, Any]:
        """Get contributor analytics and patterns"""
        total_commits = len(self.commits)
        total_contributors = len(self.contributors)
        
        # Top contributors
        top_contributors = sorted(self.contributors, key=lambda x: x.commits, reverse=True)[:10]
        
        # Contribution patterns
        commit_patterns = {}
        for commit in self.commits:
            hour = commit.timestamp.hour
            day = commit.timestamp.strftime('%A')
            
            if day not in commit_patterns:
                commit_patterns[day] = {}
            commit_patterns[day][hour] = commit_patterns[day].get(hour, 0) + 1
        
        # Language expertise
        language_experts = {}
        for contributor in self.contributors:
            for lang in contributor.languages:
                if lang not in language_experts:
                    language_experts[lang] = []
                language_experts[lang].append({
                    "username": contributor.username,
                    "commits": contributor.commits,
                    "additions": contributor.additions
                })
        
        # Sort experts by commits
        for lang in language_experts:
            language_experts[lang] = sorted(language_experts[lang], key=lambda x: x["commits"], reverse=True)[:3]
        
        return {
            "overview": {
                "total_contributors": total_contributors,
                "total_commits": total_commits,
                "active_contributors_30d": len([c for c in self.contributors if (datetime.utcnow() - c.last_contribution).days <= 30]),
                "new_contributors_30d": len([c for c in self.contributors if (datetime.utcnow() - c.first_contribution).days <= 30])
            },
            "top_contributors": [
                {
                    "username": c.username,
                    "full_name": c.full_name,
                    "commits": c.commits,
                    "additions": c.additions,
                    "deletions": c.deletions,
                    "pull_requests": c.pull_requests,
                    "repositories": len(c.repositories)
                }
                for c in top_contributors
            ],
            "contribution_patterns": {
                "by_day": {day: sum(hours.values()) for day, hours in commit_patterns.items()},
                "by_hour": {
                    str(hour): sum(commit_patterns.get(day, {}).get(hour, 0) for day in commit_patterns)
                    for hour in range(24)
                }
            },
            "language_experts": language_experts,
            "collaboration_metrics": {
                "average_repositories_per_contributor": round(sum(len(c.repositories) for c in self.contributors) / len(self.contributors), 1),
                "cross_repository_contributors": len([c for c in self.contributors if len(c.repositories) > 1]),
                "code_review_participation": round(sum(c.code_reviews for c in self.contributors) / len(self.contributors), 1)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_code_velocity_analytics(self) -> Dict[str, Any]:
        """Get code velocity and productivity analytics"""
        # Calculate velocity metrics
        last_30_days = datetime.utcnow() - timedelta(days=30)
        recent_commits = [c for c in self.commits if c.timestamp >= last_30_days]
        recent_prs = [pr for pr in self.pull_requests if datetime.fromisoformat(pr["created_at"].replace('Z', '+00:00')) >= last_30_days]
        
        # Daily commit trends
        daily_commits = {}
        for commit in recent_commits:
            date_key = commit.timestamp.strftime('%Y-%m-%d')
            daily_commits[date_key] = daily_commits.get(date_key, 0) + 1
        
        # Code churn analysis
        total_additions = sum(c.additions for c in recent_commits)
        total_deletions = sum(c.deletions for c in recent_commits)
        churn_ratio = total_deletions / max(total_additions, 1)
        
        # PR metrics
        merged_prs = [pr for pr in recent_prs if pr["status"] == "merged"]
        if merged_prs:
            avg_pr_size = sum(pr["additions"] + pr["deletions"] for pr in merged_prs) / len(merged_prs)
            avg_review_time = sum((datetime.fromisoformat(pr["merged_at"].replace('Z', '+00:00')) - 
                                 datetime.fromisoformat(pr["created_at"].replace('Z', '+00:00'))).total_seconds() 
                                for pr in merged_prs if pr["merged_at"]) / len(merged_prs) / 3600  # hours
        else:
            avg_pr_size = 0
            avg_review_time = 0
        
        return {
            "velocity_metrics": {
                "commits_per_day": round(len(recent_commits) / 30, 1),
                "lines_per_day": round((total_additions + total_deletions) / 30, 1),
                "prs_per_week": round(len(recent_prs) / 4.3, 1),
                "merge_rate": round(len(merged_prs) / max(len(recent_prs), 1) * 100, 1)
            },
            "code_quality_metrics": {
                "code_churn_ratio": round(churn_ratio, 3),
                "average_pr_size": round(avg_pr_size, 1),
                "average_review_time_hours": round(avg_review_time, 1),
                "test_coverage_trend": "improving"  # Mock data
            },
            "productivity_trends": {
                "daily_commits": daily_commits,
                "peak_productivity_day": max(daily_commits.keys(), key=lambda k: daily_commits[k]) if daily_commits else None,
                "productivity_consistency": round(random.uniform(0.7, 0.9), 2),  # Mock consistency score
                "burndown_velocity": round(random.uniform(8.5, 12.3), 1)  # Mock velocity
            },
            "collaboration_efficiency": {
                "average_pr_comments": round(sum(pr["comments"] for pr in recent_prs) / max(len(recent_prs), 1), 1),
                "cross_team_collaboration": len(set(pr["author"] for pr in recent_prs)),
                "knowledge_sharing_score": round(random.uniform(7.5, 9.2), 1)  # Mock score
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_repository_insights(self, repository_name: str) -> Dict[str, Any]:
        """Get detailed insights for a specific repository"""
        repo = next((r for r in self.repositories if r.name == repository_name), None)
        if not repo:
            return {"error": "Repository not found"}
        
        # Get commits for this repository
        repo_commits = [c for c in self.commits if c.repository == repository_name]
        repo_prs = [pr for pr in self.pull_requests if pr["repository"] == repository_name]
        
        # Calculate repository-specific metrics
        total_lines = sum(c.additions + c.deletions for c in repo_commits)
        active_contributors = len(set(c.author for c in repo_commits))
        
        # Commit frequency analysis
        commit_frequency = {}
        for commit in repo_commits:
            month_key = commit.timestamp.strftime('%Y-%m')
            commit_frequency[month_key] = commit_frequency.get(month_key, 0) + 1
        
        return {
            "repository": {
                "name": repo.name,
                "language": repo.language,
                "stars": repo.stars,
                "forks": repo.forks,
                "size_kb": repo.size_kb,
                "created_at": repo.created_at.isoformat(),
                "last_commit": repo.last_commit.isoformat()
            },
            "activity_metrics": {
                "total_commits": len(repo_commits),
                "total_lines_changed": total_lines,
                "active_contributors": active_contributors,
                "pull_requests": len(repo_prs),
                "open_issues": repo.open_issues
            },
            "commit_patterns": {
                "monthly_frequency": commit_frequency,
                "most_active_month": max(commit_frequency.keys(), key=lambda k: commit_frequency[k]) if commit_frequency else None,
                "commit_size_distribution": {
                    "small": len([c for c in repo_commits if c.additions + c.deletions <= 50]),
                    "medium": len([c for c in repo_commits if 50 < c.additions + c.deletions <= 200]),
                    "large": len([c for c in repo_commits if c.additions + c.deletions > 200])
                }
            },
            "contributor_analysis": {
                "top_contributors": sorted([
                    {
                        "author": author,
                        "commits": len(author_commits),
                        "additions": sum(c.additions for c in author_commits),
                        "deletions": sum(c.deletions for c in author_commits)
                    }
                    for author, author_commits in 
                    {author: [c for c in repo_commits if c.author == author] 
                     for author in set(c.author for c in repo_commits)}.items()
                ], key=lambda x: x["commits"], reverse=True)[:5]
            },
            "health_indicators": {
                "commit_recency": (datetime.utcnow() - repo.last_commit).days,
                "contributor_diversity": active_contributors,
                "pr_merge_rate": round(len([pr for pr in repo_prs if pr["status"] == "merged"]) / max(len(repo_prs), 1) * 100, 1),
                "issue_resolution_rate": round(random.uniform(75, 95), 1)  # Mock data
            },
            "timestamp": datetime.utcnow().isoformat()
        }

# Create global instance
git_analytics = GitAnalyticsService()

if __name__ == "__main__":
    # Test Git analytics features
    async def test_git_analytics():
        print("🔍 Testing Git Platform Analytics")
        print("=" * 45)
        
        # Test repository analytics
        repo_analytics = await git_analytics.get_repository_analytics()
        print(f"✅ Repository Analytics:")
        print(f"   • Total Repositories: {repo_analytics['overview']['total_repositories']}")
        print(f"   • Total Stars: {repo_analytics['overview']['total_stars']}")
        print(f"   • Average Health Score: {repo_analytics['overview']['average_health_score']}")
        print()
        
        # Test contributor analytics
        contributor_analytics = await git_analytics.get_contributor_analytics()
        print(f"✅ Contributor Analytics:")
        print(f"   • Total Contributors: {contributor_analytics['overview']['total_contributors']}")
        print(f"   • Active Contributors (30d): {contributor_analytics['overview']['active_contributors_30d']}")
        print(f"   • Top Contributor: {contributor_analytics['top_contributors'][0]['username']}")
        print()
        
        # Test velocity analytics
        velocity_analytics = await git_analytics.get_code_velocity_analytics()
        print(f"✅ Code Velocity Analytics:")
        print(f"   • Commits/Day: {velocity_analytics['velocity_metrics']['commits_per_day']}")
        print(f"   • PR Merge Rate: {velocity_analytics['velocity_metrics']['merge_rate']}%")
        print(f"   • Avg Review Time: {velocity_analytics['code_quality_metrics']['average_review_time_hours']}h")
        print()
        
        # Test repository insights
        repo_insights = await git_analytics.get_repository_insights("opssight-frontend")
        print(f"✅ Repository Insights (opssight-frontend):")
        print(f"   • Total Commits: {repo_insights['activity_metrics']['total_commits']}")
        print(f"   • Active Contributors: {repo_insights['activity_metrics']['active_contributors']}")
        print(f"   • Health Score: {repo_insights['health_indicators']['pr_merge_rate']}%")
        
        print("\n✅ Git analytics system test completed!")
    
    asyncio.run(test_git_analytics())