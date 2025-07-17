'use client';

import React from 'react';

interface ProgressRingProps {
  value: number; // Percentage 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  animated?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 60,
  strokeWidth = 6,
  color = '#3b82f6',
  backgroundColor = 'rgba(148, 163, 184, 0.2)',
  showValue = true,
  animated = true,
  className = '',
  children
}: ProgressRingProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={animated ? 'transition-all duration-700 ease-out' : ''}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children ? children : (
          showValue && (
            <span className="text-sm font-semibold text-white">
              {Math.round(normalizedValue)}%
            </span>
          )
        )}
      </div>
    </div>
  );
}

export default ProgressRing;