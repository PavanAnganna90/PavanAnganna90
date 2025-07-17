'use client';

import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
  animated?: boolean;
  showLastPoint?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 24,
  color = '#3b82f6',
  strokeWidth = 1.5,
  fill = false,
  animated = true,
  showLastPoint = false,
  className = ''
}: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`bg-slate-700/20 rounded ${className}`} style={{ width, height }}>
        <div className="flex items-center justify-center h-full text-slate-500 text-xs">
          --
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const padding = 2;
  const stepX = (width - padding * 2) / (data.length - 1);
  
  const points = data.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;
  
  // Create fill area path if needed
  const fillPath = fill ? `${pathData} L ${padding + (data.length - 1) * stepX},${height - padding} L ${padding},${height - padding} Z` : '';

  // Get last point coordinates for dot
  const lastPoint = points[points.length - 1]?.split(',');
  const lastX = lastPoint ? parseFloat(lastPoint[0]) : 0;
  const lastY = lastPoint ? parseFloat(lastPoint[1]) : 0;

  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={className} style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        {fill && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
        )}
        
        {/* Fill area */}
        {fill && fillPath && (
          <path
            d={fillPath}
            fill={`url(#${gradientId})`}
            className={animated ? 'transition-all duration-300 ease-in-out' : ''}
          />
        )}
        
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
        
        {/* Last point dot */}
        {showLastPoint && (
          <circle
            cx={lastX}
            cy={lastY}
            r="2"
            fill={color}
            className={animated ? 'transition-all duration-300 ease-in-out' : ''}
          />
        )}
      </svg>
    </div>
  );
}

export default Sparkline;