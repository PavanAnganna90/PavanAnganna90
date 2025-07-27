'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PostManagement } from '@/components/dashboard/PostManagement';
import { AuthProvider } from '@/contexts/DashboardAuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Toaster } from '@/components/ui/toaster';

export default function PostsPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardLayout>
          <PostManagement />
        </DashboardLayout>
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  );
}