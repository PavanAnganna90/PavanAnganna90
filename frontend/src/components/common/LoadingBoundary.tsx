"use client";

import React, { Suspense } from 'react';

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
}

/**
 * Default loading component with accessibility considerations
 */
const DefaultLoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[200px] p-4">
    <div className="text-center">
      <div 
        className="inline-flex items-center justify-center w-8 h-8 mb-2"
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <svg 
          className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

/**
 * Loading Boundary Component
 * 
 * Provides consistent loading states across the application
 * - Wraps Suspense for better error handling
 * - Accessibility: Proper ARIA attributes
 * - Performance: Minimal DOM updates
 * - Customizable fallback UI
 */
export function LoadingBoundary({ 
  children, 
  fallback,
  message 
}: LoadingBoundaryProps) {
  return (
    <Suspense fallback={fallback || <DefaultLoadingFallback message={message} />}>
      {children}
    </Suspense>
  );
}

/**
 * Skeleton loader for content placeholders
 * Evidence-based: Reduces perceived loading time
 */
export function SkeletonLoader({ 
  className = "",
  lines = 3 
}: { 
  className?: string;
  lines?: number;
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Component-specific loading states
 */
export const LoadingStates = {
  Card: () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
  ),
  
  Table: () => (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-100 dark:bg-gray-800 mb-2"></div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-50 dark:bg-gray-900 mb-1"></div>
      ))}
    </div>
  ),
  
  Chart: () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded"></div>
    </div>
  )
};