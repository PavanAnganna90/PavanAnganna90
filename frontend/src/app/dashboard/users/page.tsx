'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import UserManagement from '@/components/dashboard/UserManagement';
import { AuthProvider } from '@/contexts/DashboardAuthContext';

export default function UsersPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <UserManagement />
      </DashboardLayout>
    </AuthProvider>
  );
}