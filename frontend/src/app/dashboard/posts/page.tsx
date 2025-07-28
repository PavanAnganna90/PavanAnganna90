'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import PostManagement from '@/components/dashboard/PostManagement';
import { AuthProvider } from '@/contexts/DashboardAuthContext';

export default function PostsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <PostManagement />
      </DashboardLayout>
    </AuthProvider>
  );
}