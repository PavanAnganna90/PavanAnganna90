'use client';

import React from 'react';

interface LineChartProps {
  data: number[];
  height?: number;
  color?: string;
  strokeWidth?: number;
  showDots?: boolean;
  animated?: boolean;
  className?: string;
}

export function LineChart({
  data,
  height = 40,
  color = '#3b82f6',
  strokeWidth = 2,
  showDots = false,
  animated = true,
  className = ''
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-slate-700/20 rounded ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full text-slate-500 text-xs">
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
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
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
          stroke={color}
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
              fill={color}
              className={animated ? 'transition-all duration-300 ease-in-out' : ''}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default LineChart;