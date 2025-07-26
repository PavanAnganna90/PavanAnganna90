#!/usr/bin/env python3
"""
AI-Powered Code Review System - Typo.app Replica
Context-aware code analysis, PR summaries, and automated quality checks
"""

import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging
import random
from enum import Enum

class SeverityLevel(Enum):
    """Issue severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class IssueType(Enum):
    """Code issue types"""
    SECURITY = "security"
    PERFORMANCE = "performance"
    MAINTAINABILITY = "maintainability"
    RELIABILITY = "reliability"
    STYLE = "style"
    DOCUMENTATION = "documentation"
    TESTING = "testing"

@dataclass
class CodeIssue:
    """Code issue identified by AI"""
    id: str
    type: IssueType
    severity: SeverityLevel
    title: str
    description: str
    file_path: str
    line_number: int
    code_snippet: str
    suggestion: str
    fix_confidence: float  # 0-1
    auto_fixable: bool
    explanation: str

@dataclass
class PRSummary:
    """AI-generated pull request summary"""
    pr_id: str
    title: str
    ai_summary: str
    health_score: float  # 0-10
    complexity_score: float  # 0-10
    risk_level: str  # low, medium, high
    estimated_review_time: int  # minutes
    key_changes: List[str]
    concerns: List[str]
    recommendations: List[str]
    generated_at: datetime

class AICodeReviewService:
    """AI-powered code review service - Typo replica"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Mock AI models and analysis patterns
        self.security_patterns = [
            r"password\s*=\s*['\"].*['\"]",
            r"api_key\s*=\s*['\"].*['\"]",
            r"secret\s*=\s*['\"].*['\"]",
            r"eval\s*\(",
            r"exec\s*\(",
            r"__import__\s*\("
        ]
        
        self.performance_patterns = [
            r"for.*in.*range\(len",
            r"\.append\(.*\)\s*$",
            r"time\.sleep\(",
            r"\+\s*=.*\+",
            r"\.find\(.*\)\s*!=\s*-1"
        ]
        
        # Generate mock data
        self.mock_files = self._generate_mock_code_files()
        self.mock_prs = self._generate_mock_pull_requests()
        
    def _generate_mock_code_files(self) -> List[Dict[str, Any]]:
        """Generate mock code files for analysis"""
        return [
            {
                "path": "src/auth/authentication.py",
                "language": "python",
                "lines": 156,
                "content": '''
def authenticate_user(username, password):
    # TODO: Add proper password hashing
    if username == "admin" and password == "admin123":
        return {"user": username, "role": "admin"}
    
    # Check against database
    user = db.query(f"SELECT * FROM users WHERE username = '{username}'")
    if user and user.password == password:
        return {"user": username, "role": user.role}
    return None

def generate_token(user_data):
    import time
    # Simple token generation - needs improvement
    token = f"{user_data['user']}_{int(time.time())}"
    return token
'''
            },
            {
                "path": "src/api/endpoints.py", 
                "language": "python",
                "lines": 234,
                "content": '''
@app.get("/api/users")
def get_users():
    users = []
    for i in range(len(all_users)):  # Performance issue
        user = all_users[i]
        if user.active:
            users.append(user)
    return users

def process_data(data_list):
    result = ""
    for item in data_list:
        result += str(item) + ","  # String concatenation in loop
    return result
'''
            },
            {
                "path": "frontend/src/components/Dashboard.tsx",
                "language": "typescript",
                "lines": 89,
                "content": '''
interface Props {
    user: any;  // Should be properly typed
    data: any[];
}

const Dashboard: React.FC<Props> = ({ user, data }) => {
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        // Missing dependency array
        fetchData();
    });
    
    const fetchData = async () => {
        try {
            const response = await fetch('/api/data');
            const result = await response.json();
            // No error handling for failed requests
            setData(result);
        } catch (error) {
            console.log(error);  // Should use proper logging
        }
    };
'''
            }
        ]
    
    def _generate_mock_pull_requests(self) -> List[Dict[str, Any]]:
        """Generate mock pull requests for analysis"""
        return [
            {
                "id": "pr_001",
                "title": "Add user authentication system",
                "author": "sarah_chen",
                "created_at": datetime.utcnow() - timedelta(hours=6),
                "files_changed": ["src/auth/authentication.py", "src/auth/models.py", "tests/test_auth.py"],
                "lines_added": 145,
                "lines_removed": 23,
                "commits": 4,
                "description": "Implements JWT-based authentication with role-based access control"
            },
            {
                "id": "pr_002", 
                "title": "Optimize API performance and fix queries",
                "author": "mike_johnson",
                "created_at": datetime.utcnow() - timedelta(hours=12),
                "files_changed": ["src/api/endpoints.py", "src/database/queries.py"],
                "lines_added": 67,
                "lines_removed": 89,
                "commits": 2,
                "description": "Refactors database queries and improves API response times"
            },
            {
                "id": "pr_003",
                "title": "Update React dashboard components",
                "author": "emily_davis", 
                "created_at": datetime.utcnow() - timedelta(hours=18),
                "files_changed": ["frontend/src/components/Dashboard.tsx", "frontend/src/types/index.ts"],
                "lines_added": 234,
                "lines_removed": 156,
                "commits": 6,
                "description": "Modernizes React components and improves TypeScript definitions"
            }
        ]
    
    async def analyze_pull_request(self, pr_id: str) -> Dict[str, Any]:
        """Analyze pull request with AI - core Typo feature"""
        # Find PR data
        pr_data = next((pr for pr in self.mock_prs if pr["id"] == pr_id), None)
        if not pr_data:
            return {"error": "Pull request not found"}
        
        # Analyze each file in the PR
        issues = []
        total_complexity = 0
        security_concerns = 0
        
        for file_path in pr_data["files_changed"]:
            file_data = next((f for f in self.mock_files if f["path"] == file_path), None)
            if file_data:
                file_issues = await self._analyze_file(file_data)
                issues.extend(file_issues)
                
                # Calculate complexity and security metrics
                if file_data["language"] == "python":
                    total_complexity += self._calculate_python_complexity(file_data["content"])
                elif file_data["language"] == "typescript":
                    total_complexity += self._calculate_typescript_complexity(file_data["content"])
                
                security_concerns += len([i for i in file_issues if i.type == IssueType.SECURITY])
        
        # Generate AI summary
        summary = await self._generate_pr_summary(pr_data, issues, total_complexity)
        
        return {
            "pr_id": pr_id,
            "analysis_summary": summary,
            "issues_found": [asdict(issue) for issue in issues],
            "metrics": {
                "total_issues": len(issues),
                "critical_issues": len([i for i in issues if i.severity == SeverityLevel.CRITICAL]),
                "security_issues": security_concerns,
                "auto_fixable_issues": len([i for i in issues if i.auto_fixable]),
                "average_fix_confidence": round(sum(i.fix_confidence for i in issues) / len(issues), 2) if issues else 0
            },
            "recommendations": await self._generate_recommendations(issues, pr_data),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _analyze_file(self, file_data: Dict[str, Any]) -> List[CodeIssue]:
        """Analyze individual file for issues"""
        issues = []
        content = file_data["content"]
        file_path = file_data["path"]
        
        # Security analysis
        for i, pattern in enumerate(self.security_patterns):
            matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                
                issue = CodeIssue(
                    id=f"sec_{i}_{line_num}",
                    type=IssueType.SECURITY,
                    severity=SeverityLevel.HIGH if "password" in match.group() else SeverityLevel.MEDIUM,
                    title="Potential Security Vulnerability",
                    description=f"Possible hardcoded credential or unsafe function usage",
                    file_path=file_path,
                    line_number=line_num,
                    code_snippet=match.group(),
                    suggestion="Use environment variables or secure credential storage",
                    fix_confidence=0.85,
                    auto_fixable=False,
                    explanation="Hardcoded credentials pose security risks and should be stored securely"
                )
                issues.append(issue)
        
        # Performance analysis
        for i, pattern in enumerate(self.performance_patterns):
            matches = re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                line_num = content[:match.start()].count('\n') + 1
                
                suggestion = "Consider using list comprehension or more efficient algorithms"
                if "range(len" in match.group():
                    suggestion = "Use enumerate() instead of range(len())"
                elif "append" in match.group():
                    suggestion = "Consider using list comprehension for better performance"
                
                issue = CodeIssue(
                    id=f"perf_{i}_{line_num}",
                    type=IssueType.PERFORMANCE,
                    severity=SeverityLevel.MEDIUM,
                    title="Performance Optimization Opportunity",
                    description="Code pattern that could be optimized for better performance",
                    file_path=file_path,
                    line_number=line_num,
                    code_snippet=match.group(),
                    suggestion=suggestion,
                    fix_confidence=0.75,
                    auto_fixable=True,
                    explanation="This pattern can be optimized for better runtime performance"
                )
                issues.append(issue)
        
        # Add some mock issues for completeness
        if file_data["language"] == "python":
            issues.extend(await self._analyze_python_specific(file_data))
        elif file_data["language"] == "typescript":
            issues.extend(await self._analyze_typescript_specific(file_data))
        
        return issues
    
    async def _analyze_python_specific(self, file_data: Dict[str, Any]) -> List[CodeIssue]:
        """Python-specific analysis"""
        issues = []
        
        # Check for SQL injection vulnerability
        if "db.query(f\"" in file_data["content"]:
            issues.append(CodeIssue(
                id="py_sql_001",
                type=IssueType.SECURITY,
                severity=SeverityLevel.CRITICAL,
                title="SQL Injection Vulnerability",
                description="Direct string formatting in SQL query can lead to SQL injection",
                file_path=file_data["path"],
                line_number=8,
                code_snippet='db.query(f"SELECT * FROM users WHERE username = \'{username}\'")',
                suggestion="Use parameterized queries or ORM methods",
                fix_confidence=0.95,
                auto_fixable=True,
                explanation="SQL injection occurs when user input is directly concatenated into SQL queries"
            ))
        
        # Check for password comparison
        if "password ==" in file_data["content"]:
            issues.append(CodeIssue(
                id="py_auth_001",
                type=IssueType.SECURITY,
                severity=SeverityLevel.HIGH,
                title="Insecure Password Comparison",
                description="Plain text password comparison is insecure",
                file_path=file_data["path"],
                line_number=9,
                code_snippet="if user and user.password == password:",
                suggestion="Use bcrypt or similar hashing library for password verification",
                fix_confidence=0.90,
                auto_fixable=False,
                explanation="Passwords should be hashed and verified using secure comparison methods"
            ))
        
        return issues
    
    async def _analyze_typescript_specific(self, file_data: Dict[str, Any]) -> List[CodeIssue]:
        """TypeScript-specific analysis"""
        issues = []
        
        # Check for any types
        if ": any" in file_data["content"]:
            issues.append(CodeIssue(
                id="ts_type_001",
                type=IssueType.MAINTAINABILITY,
                severity=SeverityLevel.MEDIUM,
                title="Loose Type Definition",
                description="Using 'any' type reduces type safety benefits",
                file_path=file_data["path"],
                line_number=2,
                code_snippet="user: any;",
                suggestion="Define proper interface or type for better type safety",
                fix_confidence=0.80,
                auto_fixable=False,
                explanation="Specific types help catch errors at compile time and improve code maintainability"
            ))
        
        # Check for missing dependency array
        if "useEffect(() => {" in file_data["content"] and not "], [" in file_data["content"]:
            issues.append(CodeIssue(
                id="ts_hook_001",
                type=IssueType.RELIABILITY,
                severity=SeverityLevel.MEDIUM,
                title="Missing useEffect Dependencies",
                description="useEffect without dependency array may cause infinite re-renders",
                file_path=file_data["path"],
                line_number=10,
                code_snippet="useEffect(() => {\n        fetchData();\n    });",
                suggestion="Add dependency array to useEffect to control when it runs",
                fix_confidence=0.85,
                auto_fixable=True,
                explanation="Missing dependency arrays can cause performance issues and unexpected behavior"
            ))
        
        return issues
    
    def _calculate_python_complexity(self, content: str) -> float:
        """Calculate Python code complexity"""
        # Simple complexity calculation based on control structures
        complexity_keywords = ["if", "elif", "else", "for", "while", "try", "except", "with"]
        complexity_score = 1  # Base complexity
        
        for keyword in complexity_keywords:
            complexity_score += content.count(f"{keyword} ") + content.count(f"{keyword}(")
        
        return min(complexity_score / 10, 10.0)  # Normalize to 0-10
    
    def _calculate_typescript_complexity(self, content: str) -> float:
        """Calculate TypeScript code complexity"""
        complexity_keywords = ["if", "else", "for", "while", "switch", "try", "catch"]
        complexity_score = 1
        
        for keyword in complexity_keywords:
            complexity_score += content.count(f"{keyword} ") + content.count(f"{keyword}(")
        
        # Add complexity for React hooks and async operations
        complexity_score += content.count("useState") * 0.5
        complexity_score += content.count("useEffect") * 0.5
        complexity_score += content.count("async ") * 0.3
        
        return min(complexity_score / 8, 10.0)
    
    async def _generate_pr_summary(self, pr_data: Dict[str, Any], issues: List[CodeIssue], complexity: float) -> PRSummary:
        """Generate AI-powered PR summary"""
        critical_issues = len([i for i in issues if i.severity == SeverityLevel.CRITICAL])
        security_issues = len([i for i in issues if i.type == IssueType.SECURITY])
        
        # Calculate health score (0-10)
        health_score = 10.0
        health_score -= critical_issues * 2.0
        health_score -= security_issues * 1.5
        health_score -= len(issues) * 0.1
        health_score = max(0.0, health_score)
        
        # Determine risk level
        if critical_issues > 0 or security_issues > 2:
            risk_level = "high"
        elif len(issues) > 5 or complexity > 7:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Generate key changes summary
        key_changes = []
        if "auth" in pr_data["title"].lower():
            key_changes.append("Authentication system implementation")
        if "api" in pr_data["title"].lower():
            key_changes.append("API endpoint modifications")
        if "component" in pr_data["title"].lower():
            key_changes.append("React component updates")
        
        # Generate concerns
        concerns = []
        if critical_issues > 0:
            concerns.append(f"{critical_issues} critical security/reliability issues found")
        if complexity > 8:
            concerns.append("High code complexity may affect maintainability")
        if pr_data["lines_added"] > 500:
            concerns.append("Large PR size may impact review thoroughness")
        
        # Generate recommendations
        recommendations = []
        if security_issues > 0:
            recommendations.append("Address security vulnerabilities before merging")
        if len(issues) > 10:
            recommendations.append("Consider breaking this PR into smaller changes")
        if complexity > 7:
            recommendations.append("Add comprehensive tests for complex logic")
        
        # AI summary text
        ai_summary = f"This PR {pr_data['description'].lower()}. "
        ai_summary += f"Analysis found {len(issues)} potential issues across {len(pr_data['files_changed'])} files. "
        ai_summary += f"Health score: {health_score:.1f}/10. "
        if risk_level == "high":
            ai_summary += "⚠️ High risk changes require careful review."
        elif risk_level == "medium":
            ai_summary += "⚡ Medium risk changes with some concerns."
        else:
            ai_summary += "✅ Low risk changes look good overall."
        
        return PRSummary(
            pr_id=pr_data["id"],
            title=pr_data["title"],
            ai_summary=ai_summary,
            health_score=round(health_score, 1),
            complexity_score=round(complexity, 1),
            risk_level=risk_level,
            estimated_review_time=self._estimate_review_time(pr_data, issues),
            key_changes=key_changes,
            concerns=concerns,
            recommendations=recommendations,
            generated_at=datetime.utcnow()
        )
    
    def _estimate_review_time(self, pr_data: Dict[str, Any], issues: List[CodeIssue]) -> int:
        """Estimate review time in minutes"""
        base_time = 10  # Base 10 minutes
        
        # Add time based on PR size
        base_time += (pr_data["lines_added"] + pr_data["lines_removed"]) / 20
        
        # Add time for issues
        base_time += len(issues) * 2
        
        # Add time for file complexity
        base_time += len(pr_data["files_changed"]) * 5
        
        return min(int(base_time), 180)  # Cap at 3 hours
    
    async def _generate_recommendations(self, issues: List[CodeIssue], pr_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Security recommendations
        security_issues = [i for i in issues if i.type == IssueType.SECURITY]
        if security_issues:
            recommendations.append({
                "category": "Security",
                "priority": "high",
                "title": "Address Security Vulnerabilities",
                "description": f"Found {len(security_issues)} security issues that should be fixed before merging",
                "action_items": [
                    "Review hardcoded credentials and move to environment variables",
                    "Implement proper input validation and sanitization",
                    "Use parameterized queries to prevent SQL injection"
                ]
            })
        
        # Performance recommendations
        perf_issues = [i for i in issues if i.type == IssueType.PERFORMANCE]
        if perf_issues:
            recommendations.append({
                "category": "Performance",
                "priority": "medium",
                "title": "Optimize Performance",
                "description": f"Found {len(perf_issues)} performance optimization opportunities",
                "action_items": [
                    "Replace inefficient loops with list comprehensions",
                    "Use appropriate data structures for better time complexity",
                    "Consider caching for frequently accessed data"
                ]
            })
        
        # Code quality recommendations
        if len(issues) > 5:
            recommendations.append({
                "category": "Code Quality",
                "priority": "medium",
                "title": "Improve Code Quality",
                "description": "Multiple code quality issues detected",
                "action_items": [
                    "Add proper type annotations and interfaces",
                    "Improve error handling and logging",
                    "Add comprehensive unit tests"
                ]
            })
        
        return recommendations
    
    async def get_ai_review_summary(self) -> Dict[str, Any]:
        """Get overall AI review summary across all PRs"""
        all_analyses = []
        
        for pr in self.mock_prs:
            analysis = await self.analyze_pull_request(pr["id"])
            all_analyses.append(analysis)
        
        # Aggregate metrics
        total_issues = sum(a["metrics"]["total_issues"] for a in all_analyses)
        total_critical = sum(a["metrics"]["critical_issues"] for a in all_analyses)
        total_security = sum(a["metrics"]["security_issues"] for a in all_analyses)
        total_auto_fixable = sum(a["metrics"]["auto_fixable_issues"] for a in all_analyses)
        
        avg_health_score = sum(
            a["analysis_summary"]["health_score"] for a in all_analyses
        ) / len(all_analyses) if all_analyses else 0
        
        return {
            "overview": {
                "total_prs_analyzed": len(all_analyses),
                "total_issues_found": total_issues,
                "critical_issues": total_critical,
                "security_issues": total_security,
                "auto_fixable_issues": total_auto_fixable,
                "average_health_score": round(avg_health_score, 1)
            },
            "ai_insights": [
                {
                    "type": "trend",
                    "title": "Code Quality Improving",
                    "description": f"Average health score is {avg_health_score:.1f}/10, indicating good overall code quality",
                    "recommendation": "Continue current practices and address critical issues promptly"
                },
                {
                    "type": "security",
                    "title": "Security Focus Needed",
                    "description": f"{total_security} security issues found across recent PRs",
                    "recommendation": "Implement security-focused code review checklist"
                },
                {
                    "type": "automation",
                    "title": "Automation Opportunity",
                    "description": f"{total_auto_fixable} issues can be automatically fixed",
                    "recommendation": "Implement auto-fix pipeline for common issues"
                }
            ],
            "productivity_impact": {
                "time_saved_by_ai": f"{len(all_analyses) * 15} minutes",  # Estimated time saved
                "issues_prevented": total_critical + total_security,
                "code_quality_improvement": "12%"  # Mock metric
            },
            "recent_analyses": all_analyses,
            "timestamp": datetime.utcnow().isoformat()
        }

# Create global instance
ai_code_review = AICodeReviewService()

if __name__ == "__main__":
    # Test AI code review system
    async def test_ai_code_review():
        print("🤖 Testing AI Code Review System (Typo Replica)")
        print("=" * 55)
        
        # Test PR analysis
        pr_analysis = await ai_code_review.analyze_pull_request("pr_001")
        print(f"✅ PR Analysis:")
        print(f"   • Health Score: {pr_analysis['analysis_summary']['health_score']}/10")
        print(f"   • Risk Level: {pr_analysis['analysis_summary']['risk_level']}")
        print(f"   • Issues Found: {pr_analysis['metrics']['total_issues']}")
        print(f"   • Critical Issues: {pr_analysis['metrics']['critical_issues']}")
        print(f"   • Auto-fixable: {pr_analysis['metrics']['auto_fixable_issues']}")
        print()
        
        # Test overall summary
        summary = await ai_code_review.get_ai_review_summary()
        print(f"✅ AI Review Summary:")
        print(f"   • PRs Analyzed: {summary['overview']['total_prs_analyzed']}")
        print(f"   • Average Health: {summary['overview']['average_health_score']}/10")
        print(f"   • Security Issues: {summary['overview']['security_issues']}")
        print(f"   • Time Saved: {summary['productivity_impact']['time_saved_by_ai']}")
        
        print("\n✅ AI Code Review system test completed!")
    
    asyncio.run(test_ai_code_review())