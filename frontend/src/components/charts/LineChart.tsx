'use client';

import React from 'react';
import { useChartTheme } from '@/hooks/useChartTheme';

interface LineChartProps {
  data: number[];
  height?: number;
  color?: string;
  strokeWidth?: number;
  showDots?: boolean;
  animated?: boolean;
  className?: string;
  colorIndex?: number; // For automatic theme color selection
}

export function LineChart({
  data,
  height = 40,
  color,
  strokeWidth = 2,
  showDots = false,
  animated = true,
  className = '',
  colorIndex = 0
}: LineChartProps) {
  const { getColor } = useChartTheme();
  const chartColor = color || getColor(colorIndex);
  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-gray-100 dark:bg-invary-secondary/20 rounded ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full text-invary-neutral dark:text-gray-400 text-xs">
          No data
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1; // Prevent division by zero

  // Calculate SVG path
  const width = 100; // Use percentage width
  const padding = 2;
  const stepX = (width - padding * 2) / (data.length - 1);
  
  const points = data.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  // Create gradient for fill area
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <path
          d={`${pathData} L ${padding + (data.length - 1) * stepX},${height - padding} L ${padding},${height - padding} Z`}
          fill={`url(#${gradientId})`}
          className={animated ? 'transition-all duration-300 ease-in-out' : ''}
        />
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={chartColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'transition-all duration-300 ease-in-out' : ''}
        />
        
        {/* Dots */}
        {showDots && data.map((value, index) => {
          const x = padding + index * stepX;
          const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={chartColor}
              className={animated ? 'transition-all duration-300 ease-in-out' : ''}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default LineChart;