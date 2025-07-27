'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AuthProvider } from '@/contexts/DashboardAuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Toaster } from '@/components/ui/toaster';
import { AuthStatus } from '@/components/dashboard/AuthStatus';

export default function DashboardPage() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DashboardLayout>
          <DashboardOverview />
          <AuthStatus />
        </DashboardLayout>
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  );
}
