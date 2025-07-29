'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Import the desktop dashboard directly
import DevOpsCommandCenter from '@/app/dashboard/enhanced/page';

// Dynamically import mobile dashboard
const MobileOptimizedDashboard = dynamic(
  () => import('./MobileOptimizedDashboard').then(mod => ({ default: mod.MobileOptimizedDashboard })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }
);

interface ResponsiveDashboardProps {
  activeIncidents?: number;
  onCallEngineer?: string;
}

/**
 * Responsive dashboard wrapper that serves different UIs based on device
 * - Mobile: Optimized for on-call engineers on the go
 * - Tablet: Simplified desktop view
 * - Desktop: Full DevOps command center
 */
export function ResponsiveDashboard({ 
  activeIncidents = 0, 
  onCallEngineer 
}: ResponsiveDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing dashboard...</p>
        </div>
      </div>
    );
  }

  // Mobile view - optimized for on-call engineers
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileOptimizedDashboard 
          activeIncidents={activeIncidents}
          onCallEngineer={onCallEngineer}
        />
        
        {/* Mobile bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
          <div className="grid grid-cols-4 h-16">
            <button className="flex flex-col items-center justify-center gap-1 text-primary">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs">Home</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs">Metrics</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground relative">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {activeIncidents > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                  {activeIncidents}
                </span>
              )}
              <span className="text-xs">Alerts</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="text-xs">More</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tablet view - simplified desktop with touch-friendly elements
  if (isTablet) {
    return (
      <div className="tablet-view">
        <DevOpsCommandCenter />
        <style jsx global>{`
          .tablet-view .grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .tablet-view button {
            min-height: 44px;
          }
          .tablet-view .text-sm {
            font-size: 1rem;
          }
        `}</style>
      </div>
    );
  }

  // Desktop view - full command center
  return <DevOpsCommandCenter />;
}

export default ResponsiveDashboard;