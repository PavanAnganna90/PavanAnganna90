/**
 * Automation Coverage Analysis Page
 * 
 * Dedicated page for Ansible automation coverage analysis and log parsing.
 * Provides comprehensive automation insights and playbook analysis.
 */

'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React from 'react';
import { AnsibleCoverageViewer } from '@/components/automation/AnsibleCoverageViewer';

export default function AutomationPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnsibleCoverageViewer />
      </div>
    </div>
  );
}