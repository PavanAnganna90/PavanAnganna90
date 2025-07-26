#!/usr/bin/env python3
"""
Security Audit Service
Comprehensive security vulnerability tracking, compliance monitoring, and threat analysis
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging
import random
import uuid
from enum import Enum

class VulnerabilitySeverity(Enum):
    """Vulnerability severity levels"""
    CRITICAL = "critical"
    HIGH = "high" 
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class VulnerabilityStatus(Enum):
    """Vulnerability status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"
    ACCEPTED = "accepted"

class SecurityScanType(Enum):
    """Types of security scans"""
    SAST = "sast"  # Static Application Security Testing
    DAST = "dast"  # Dynamic Application Security Testing
    SCA = "sca"    # Software Composition Analysis
    CONTAINER = "container"
    INFRASTRUCTURE = "infrastructure"
    COMPLIANCE = "compliance"

@dataclass
class SecurityVulnerability:
    """Security vulnerability data"""
    id: str
    title: str
    description: str
    severity: VulnerabilitySeverity
    status: VulnerabilityStatus
    scan_type: SecurityScanType
    cve_id: Optional[str]
    cvss_score: float
    repository: str
    file_path: Optional[str]
    line_number: Optional[int]
    discovered_at: datetime
    last_updated: datetime
    assigned_to: Optional[str]
    due_date: Optional[datetime]
    remediation_guidance: str
    tags: List[str]

@dataclass
class SecurityScan:
    """Security scan execution data"""
    id: str
    scan_type: SecurityScanType
    repository: str
    branch: str
    started_at: datetime
    completed_at: Optional[datetime]
    status: str
    vulnerabilities_found: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    scan_duration_seconds: Optional[int]
    scanner_version: str
    scan_config: Dict[str, Any]

@dataclass
class ComplianceCheck:
    """Compliance framework check"""
    id: str
    framework: str  # SOC2, PCI-DSS, GDPR, etc.
    control_id: str
    control_name: str
    status: str
    last_checked: datetime
    evidence_url: Optional[str]
    responsible_team: str
    next_review_date: datetime

class SecurityAuditService:
    """Security audit and vulnerability management service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Generate mock data
        self.vulnerabilities = self._generate_mock_vulnerabilities()
        self.security_scans = self._generate_mock_security_scans()
        self.compliance_checks = self._generate_mock_compliance_checks()
        self.security_trends = self._generate_security_trends()
        
    def _generate_mock_vulnerabilities(self) -> List[SecurityVulnerability]:
        """Generate mock vulnerability data"""
        vulnerabilities = []
        
        vulnerability_templates = [
            {
                "title": "SQL Injection in user authentication",
                "description": "User input not properly sanitized in login endpoint",
                "severity": VulnerabilitySeverity.CRITICAL,
                "scan_type": SecurityScanType.SAST,
                "cve_id": "CVE-2024-1234",
                "cvss_score": 9.8,
                "file_path": "src/auth/login.py",
                "line_number": 45,
                "remediation_guidance": "Use parameterized queries and input validation"
            },
            {
                "title": "Cross-Site Scripting (XSS) vulnerability",
                "description": "Unescaped user input displayed in dashboard",
                "severity": VulnerabilitySeverity.HIGH,
                "scan_type": SecurityScanType.DAST,
                "cve_id": "CVE-2024-5678",
                "cvss_score": 7.5,
                "file_path": "frontend/src/components/UserProfile.tsx",
                "line_number": 123,
                "remediation_guidance": "Implement proper output encoding and CSP headers"
            },
            {
                "title": "Outdated dependency with known vulnerabilities",
                "description": "Using vulnerable version of express.js library",
                "severity": VulnerabilitySeverity.HIGH,
                "scan_type": SecurityScanType.SCA,
                "cve_id": "CVE-2024-9012",
                "cvss_score": 8.1,
                "file_path": "package.json",
                "line_number": 15,
                "remediation_guidance": "Update express.js to version 4.18.2 or later"
            },
            {
                "title": "Insecure container configuration",
                "description": "Container running with root privileges",
                "severity": VulnerabilitySeverity.MEDIUM,
                "scan_type": SecurityScanType.CONTAINER,
                "cve_id": None,
                "cvss_score": 5.5,
                "file_path": "Dockerfile",
                "line_number": 8,
                "remediation_guidance": "Use non-root user and drop unnecessary capabilities"
            },
            {
                "title": "Weak password policy implementation",
                "description": "Password requirements too lenient",
                "severity": VulnerabilitySeverity.MEDIUM,
                "scan_type": SecurityScanType.SAST,
                "cve_id": None,
                "cvss_score": 4.3,
                "file_path": "src/auth/password_policy.py",
                "line_number": 20,
                "remediation_guidance": "Enforce stronger password requirements and implement rate limiting"
            },
            {
                "title": "Unencrypted sensitive data in logs",
                "description": "API keys and tokens logged in plaintext",
                "severity": VulnerabilitySeverity.HIGH,
                "scan_type": SecurityScanType.SAST,
                "cve_id": None,
                "cvss_score": 7.8,
                "file_path": "src/utils/logger.py",
                "line_number": 67,
                "remediation_guidance": "Implement log sanitization and redact sensitive information"
            },
            {
                "title": "Missing security headers",
                "description": "HTTP security headers not configured",
                "severity": VulnerabilitySeverity.LOW,
                "scan_type": SecurityScanType.DAST,
                "cve_id": None,
                "cvss_score": 3.1,
                "file_path": "nginx.conf",
                "line_number": 35,
                "remediation_guidance": "Add HSTS, X-Frame-Options, and other security headers"
            }
        ]
        
        repositories = ["opssight-frontend", "opssight-backend", "opssight-infrastructure", "opssight-mobile"]
        
        for i, template in enumerate(vulnerability_templates * 5):  # Generate multiple instances
            discovered_date = datetime.utcnow() - timedelta(days=random.randint(1, 90))
            
            vulnerabilities.append(SecurityVulnerability(
                id=f"vuln_{i+1:03d}",
                title=template["title"],
                description=template["description"],
                severity=template["severity"],
                status=random.choice(list(VulnerabilityStatus)),
                scan_type=template["scan_type"],
                cve_id=template["cve_id"],
                cvss_score=template["cvss_score"],
                repository=random.choice(repositories),
                file_path=template["file_path"],
                line_number=template["line_number"],
                discovered_at=discovered_date,
                last_updated=discovered_date + timedelta(days=random.randint(0, 10)),
                assigned_to=random.choice(["sarah_chen", "mike_johnson", "alex_kumar", None]),
                due_date=discovered_date + timedelta(days=random.randint(7, 30)) if random.choice([True, False]) else None,
                remediation_guidance=template["remediation_guidance"],
                tags=random.sample(["security", "urgent", "compliance", "dependency", "code-quality"], k=random.randint(1, 3))
            ))
        
        return vulnerabilities
    
    def _generate_mock_security_scans(self) -> List[SecurityScan]:
        """Generate mock security scan data"""
        scans = []
        
        repositories = ["opssight-frontend", "opssight-backend", "opssight-infrastructure", "opssight-mobile"]
        scan_types = list(SecurityScanType)
        
        for i in range(20):
            start_time = datetime.utcnow() - timedelta(days=random.randint(0, 30))
            duration = random.randint(300, 3600)  # 5 minutes to 1 hour
            
            critical_count = random.randint(0, 3)
            high_count = random.randint(0, 8)
            medium_count = random.randint(2, 15)
            low_count = random.randint(5, 25)
            
            scans.append(SecurityScan(
                id=f"scan_{i+1:03d}",
                scan_type=random.choice(scan_types),
                repository=random.choice(repositories),
                branch=random.choice(["main", "develop", "feature/security"]),
                started_at=start_time,
                completed_at=start_time + timedelta(seconds=duration),
                status=random.choice(["completed", "completed", "completed", "failed"]),
                vulnerabilities_found=critical_count + high_count + medium_count + low_count,
                critical_count=critical_count,
                high_count=high_count,
                medium_count=medium_count,
                low_count=low_count,
                scan_duration_seconds=duration,
                scanner_version=f"SecurityScanner v{random.randint(1, 3)}.{random.randint(0, 9)}.{random.randint(0, 9)}",
                scan_config={
                    "deep_scan": random.choice([True, False]),
                    "exclude_tests": True,
                    "include_dependencies": random.choice([True, False])
                }
            ))
        
        return scans
    
    def _generate_mock_compliance_checks(self) -> List[ComplianceCheck]:
        """Generate mock compliance check data"""
        checks = []
        
        compliance_templates = [
            {"framework": "SOC2", "controls": ["CC6.1", "CC6.2", "CC6.3", "CC7.1", "CC7.2"]},
            {"framework": "PCI-DSS", "controls": ["1.1.1", "2.2.1", "3.4.1", "6.5.1", "8.2.3"]},
            {"framework": "GDPR", "controls": ["Art.25", "Art.32", "Art.33", "Art.35"]},
            {"framework": "ISO27001", "controls": ["A.12.1.1", "A.12.6.1", "A.14.2.1", "A.18.1.1"]}
        ]
        
        control_names = {
            "CC6.1": "Logical and Physical Access Controls",
            "CC6.2": "System Access Control",
            "CC7.1": "System Operations",
            "1.1.1": "Firewall Configuration Standards",
            "2.2.1": "System Hardening Procedures",
            "Art.25": "Data Protection by Design",
            "A.12.1.1": "Documented Operating Procedures"
        }
        
        teams = ["Security Team", "DevOps Team", "Compliance Team", "Engineering Team"]
        
        for framework_data in compliance_templates:
            framework = framework_data["framework"]
            for control_id in framework_data["controls"]:
                last_check = datetime.utcnow() - timedelta(days=random.randint(1, 90))
                
                checks.append(ComplianceCheck(
                    id=f"comp_{len(checks)+1:03d}",
                    framework=framework,
                    control_id=control_id,
                    control_name=control_names.get(control_id, f"{framework} Control {control_id}"),
                    status=random.choice(["compliant", "compliant", "non-compliant", "in-progress"]),
                    last_checked=last_check,
                    evidence_url=f"https://compliance.opssight.dev/{framework.lower()}/{control_id}",
                    responsible_team=random.choice(teams),
                    next_review_date=last_check + timedelta(days=random.randint(30, 90))
                ))
        
        return checks
    
    def _generate_security_trends(self) -> Dict[str, Any]:
        """Generate security trends data"""
        # Generate daily vulnerability discovery trends
        daily_trends = {}
        for i in range(30):
            date = datetime.utcnow() - timedelta(days=i)
            date_key = date.strftime('%Y-%m-%d')
            daily_trends[date_key] = {
                "discovered": random.randint(0, 8),
                "resolved": random.randint(0, 6),
                "critical": random.randint(0, 2),
                "high": random.randint(0, 3)
            }
        
        return {
            "daily_trends": daily_trends,
            "risk_score_trend": [random.randint(60, 90) for _ in range(7)],  # Weekly risk scores
            "threat_landscape": {
                "top_attack_vectors": ["SQL Injection", "XSS", "CSRF", "Dependency Vulnerabilities"],
                "emerging_threats": ["Supply Chain Attacks", "Container Escapes", "API Abuse"]
            }
        }
    
    async def get_security_overview(self) -> Dict[str, Any]:
        """Get comprehensive security overview"""
        # Count vulnerabilities by severity and status
        open_vulns = [v for v in self.vulnerabilities if v.status == VulnerabilityStatus.OPEN]
        
        severity_counts = {
            "critical": len([v for v in open_vulns if v.severity == VulnerabilitySeverity.CRITICAL]),
            "high": len([v for v in open_vulns if v.severity == VulnerabilitySeverity.HIGH]),
            "medium": len([v for v in open_vulns if v.severity == VulnerabilitySeverity.MEDIUM]),
            "low": len([v for v in open_vulns if v.severity == VulnerabilitySeverity.LOW])
        }
        
        # Calculate security score (0-100)
        total_vulns = len(open_vulns)
        if total_vulns == 0:
            security_score = 100
        else:
            # Weight by severity
            weighted_score = (
                severity_counts["critical"] * 10 +
                severity_counts["high"] * 5 +
                severity_counts["medium"] * 2 +
                severity_counts["low"] * 1
            )
            security_score = max(100 - weighted_score, 0)
        
        # Recent scan results
        recent_scans = sorted(self.security_scans, key=lambda x: x.started_at, reverse=True)[:5]
        
        # Compliance status
        compliant_checks = len([c for c in self.compliance_checks if c.status == "compliant"])
        total_checks = len(self.compliance_checks)
        compliance_percentage = round((compliant_checks / total_checks) * 100, 1) if total_checks > 0 else 0
        
        return {
            "security_overview": {
                "security_score": security_score,
                "total_vulnerabilities": len(self.vulnerabilities),
                "open_vulnerabilities": len(open_vulns),
                "resolved_this_month": len([v for v in self.vulnerabilities 
                                          if v.status == VulnerabilityStatus.RESOLVED 
                                          and (datetime.utcnow() - v.last_updated).days <= 30]),
                "critical_vulns": severity_counts["critical"],
                "high_vulns": severity_counts["high"],
                "medium_vulns": severity_counts["medium"],
                "low_vulns": severity_counts["low"]
            },
            "severity_distribution": severity_counts,
            "recent_scans": [
                {
                    "id": scan.id,
                    "type": scan.scan_type.value,
                    "repository": scan.repository,
                    "vulnerabilities_found": scan.vulnerabilities_found,
                    "started_at": scan.started_at.isoformat(),
                    "status": scan.status
                }
                for scan in recent_scans
            ],
            "compliance_status": {
                "overall_percentage": compliance_percentage,
                "compliant_controls": compliant_checks,
                "total_controls": total_checks,
                "frameworks": list(set(c.framework for c in self.compliance_checks))
            },
            "threat_intel": {
                "active_threat_campaigns": random.randint(2, 8),
                "iocs_detected": random.randint(0, 3),
                "threat_level": random.choice(["Low", "Medium", "High"])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_vulnerability_details(self, severity: Optional[str] = None, 
                                      status: Optional[str] = None) -> Dict[str, Any]:
        """Get detailed vulnerability information with filtering"""
        filtered_vulns = self.vulnerabilities
        
        if severity:
            try:
                severity_enum = VulnerabilitySeverity(severity.lower())
                filtered_vulns = [v for v in filtered_vulns if v.severity == severity_enum]
            except ValueError:
                pass
        
        if status:
            try:
                status_enum = VulnerabilityStatus(status.lower())
                filtered_vulns = [v for v in filtered_vulns if v.status == status_enum]
            except ValueError:
                pass
        
        # Sort by severity and discovery date
        severity_order = {
            VulnerabilitySeverity.CRITICAL: 0,
            VulnerabilitySeverity.HIGH: 1,
            VulnerabilitySeverity.MEDIUM: 2,
            VulnerabilitySeverity.LOW: 3
        }
        
        filtered_vulns.sort(key=lambda v: (severity_order[v.severity], v.discovered_at), reverse=True)
        
        return {
            "vulnerabilities": [
                {
                    "id": v.id,
                    "title": v.title,
                    "description": v.description,
                    "severity": v.severity.value,
                    "status": v.status.value,
                    "scan_type": v.scan_type.value,
                    "cve_id": v.cve_id,
                    "cvss_score": v.cvss_score,
                    "repository": v.repository,
                    "file_path": v.file_path,
                    "line_number": v.line_number,
                    "discovered_at": v.discovered_at.isoformat(),
                    "last_updated": v.last_updated.isoformat(),
                    "assigned_to": v.assigned_to,
                    "due_date": v.due_date.isoformat() if v.due_date else None,
                    "remediation_guidance": v.remediation_guidance,
                    "tags": v.tags
                }
                for v in filtered_vulns[:50]  # Limit to 50 results
            ],
            "total_count": len(filtered_vulns),
            "filters_applied": {
                "severity": severity,
                "status": status
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_security_trends(self) -> Dict[str, Any]:
        """Get security trends and analytics"""
        return {
            "vulnerability_trends": self.security_trends["daily_trends"],
            "risk_assessment": {
                "current_risk_score": random.randint(65, 85),
                "risk_trend": "stable",
                "risk_factors": [
                    "Critical vulnerabilities in production",
                    "Outdated dependencies",
                    "Insufficient access controls"
                ]
            },
            "scan_effectiveness": {
                "scans_per_week": len([s for s in self.security_scans 
                                     if (datetime.utcnow() - s.started_at).days <= 7]),
                "average_scan_duration": round(
                    sum(s.scan_duration_seconds for s in self.security_scans if s.scan_duration_seconds) / 
                    len([s for s in self.security_scans if s.scan_duration_seconds]) / 60, 1
                ),
                "scan_coverage": random.randint(85, 98)
            },
            "remediation_metrics": {
                "mean_time_to_remediation": random.randint(3, 14),  # days
                "sla_compliance": random.randint(80, 95),  # percentage
                "backlog_age": random.randint(15, 45)  # days
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_compliance_dashboard(self) -> Dict[str, Any]:
        """Get compliance framework dashboard"""
        # Group compliance checks by framework
        framework_status = {}
        for check in self.compliance_checks:
            if check.framework not in framework_status:
                framework_status[check.framework] = {
                    "total": 0,
                    "compliant": 0,
                    "non_compliant": 0,
                    "in_progress": 0
                }
            
            framework_status[check.framework]["total"] += 1
            framework_status[check.framework][check.status.replace("-", "_")] += 1
        
        # Calculate compliance percentages
        for framework in framework_status:
            total = framework_status[framework]["total"]
            compliant = framework_status[framework]["compliant"]
            framework_status[framework]["compliance_percentage"] = round((compliant / total) * 100, 1) if total > 0 else 0
        
        # Upcoming reviews
        upcoming_reviews = sorted(
            [c for c in self.compliance_checks if c.next_review_date > datetime.utcnow()],
            key=lambda x: x.next_review_date
        )[:10]
        
        return {
            "framework_status": framework_status,
            "overall_compliance": {
                "average_compliance": round(
                    sum(f["compliance_percentage"] for f in framework_status.values()) / len(framework_status), 1
                ) if framework_status else 0,
                "total_controls": len(self.compliance_checks),
                "compliant_controls": len([c for c in self.compliance_checks if c.status == "compliant"]),
                "overdue_reviews": len([c for c in self.compliance_checks 
                                     if c.next_review_date < datetime.utcnow()])
            },
            "upcoming_reviews": [
                {
                    "framework": review.framework,
                    "control_id": review.control_id,
                    "control_name": review.control_name,
                    "next_review_date": review.next_review_date.isoformat(),
                    "responsible_team": review.responsible_team
                }
                for review in upcoming_reviews
            ],
            "audit_trail": [
                {
                    "date": (datetime.utcnow() - timedelta(days=i)).isoformat(),
                    "action": random.choice(["Control Updated", "Evidence Uploaded", "Review Completed"]),
                    "framework": random.choice(["SOC2", "PCI-DSS", "GDPR"]),
                    "user": random.choice(["sarah_chen", "alex_kumar", "compliance_team"])
                }
                for i in range(10)
            ],
            "timestamp": datetime.utcnow().isoformat()
        }

# Create global instance
security_audit = SecurityAuditService()

if __name__ == "__main__":
    # Test security audit features
    async def test_security_audit():
        print("🔒 Testing Security Audit Service")
        print("=" * 45)
        
        # Test security overview
        overview = await security_audit.get_security_overview()
        print(f"✅ Security Overview:")
        print(f"   • Security Score: {overview['security_overview']['security_score']}/100")
        print(f"   • Open Vulnerabilities: {overview['security_overview']['open_vulnerabilities']}")
        print(f"   • Critical: {overview['security_overview']['critical_vulns']}")
        print(f"   • Compliance: {overview['compliance_status']['overall_percentage']}%")
        print()
        
        # Test vulnerability details
        vuln_details = await security_audit.get_vulnerability_details(severity="critical")
        print(f"✅ Critical Vulnerabilities:")
        print(f"   • Found: {vuln_details['total_count']} critical vulnerabilities")
        if vuln_details['vulnerabilities']:
            print(f"   • Latest: {vuln_details['vulnerabilities'][0]['title']}")
        print()
        
        # Test security trends
        trends = await security_audit.get_security_trends()
        print(f"✅ Security Trends:")
        print(f"   • Risk Score: {trends['risk_assessment']['current_risk_score']}")
        print(f"   • Scans/Week: {trends['scan_effectiveness']['scans_per_week']}")
        print(f"   • MTTR: {trends['remediation_metrics']['mean_time_to_remediation']} days")
        print()
        
        # Test compliance dashboard
        compliance = await security_audit.get_compliance_dashboard()
        print(f"✅ Compliance Dashboard:")
        print(f"   • Overall Compliance: {compliance['overall_compliance']['average_compliance']}%")
        print(f"   • Total Controls: {compliance['overall_compliance']['total_controls']}")
        print(f"   • Upcoming Reviews: {len(compliance['upcoming_reviews'])}")
        
        print("\n✅ Security audit system test completed!")
    
    asyncio.run(test_security_audit())