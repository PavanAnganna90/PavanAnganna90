'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AuthStatus } from '@/components/dashboard/AuthStatus';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardOverview />
      <AuthStatus />
    </DashboardLayout>
  );
}
