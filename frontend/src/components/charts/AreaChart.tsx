'use client';

import React from 'react';

interface AreaChartDataPoint {
  x: number | string;
  y: number;
}

interface AreaChartProps {
  data: AreaChartDataPoint[];
  height?: number;
  color?: string;
  strokeWidth?: number;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  animated?: boolean;
  className?: string;
}

export function AreaChart({
  data,
  height = 200,
  color = '#3b82f6',
  strokeWidth = 2,
  showGrid = true,
  showXAxis = true,
  showYAxis = false,
  animated = true,
  className = ''
}: AreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-slate-700/20 rounded ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full text-slate-500 text-xs">
          No data
        </div>
      </div>
    );
  }

  const padding = 20;
  const chartHeight = height - (showXAxis ? 30 : 20);
  const chartWidth = 400; // Will be scaled with viewBox

  const maxY = Math.max(...data.map(d => d.y));
  const minY = Math.min(...data.map(d => d.y));
  const yRange = maxY - minY || 1;

  // Calculate points
  const stepX = (chartWidth - padding * 2) / (data.length - 1);
  const points = data.map((point, index) => {
    const x = padding + index * stepX;
    const y = chartHeight - padding - ((point.y - minY) / yRange) * (chartHeight - padding * 2);
    return { x, y, originalY: point.y, originalX: point.x };
  });

  // Create path for area fill
  const areaPath = `
    M ${points[0].x},${chartHeight - padding}
    L ${points.map(p => `${p.x},${p.y}`).join(' L ')}
    L ${points[points.length - 1].x},${chartHeight - padding}
    Z
  `;

  // Create path for line
  const linePath = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  // Grid lines
  const gridLines = [];
  if (showGrid) {
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * (chartHeight - padding * 2)) / 4;
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={padding}
          y1={y}
          x2={chartWidth - padding}
          y2={y}
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth="1"
        />
      );
    }

    // Vertical grid lines
    const gridCount = Math.min(data.length - 1, 6);
    for (let i = 0; i <= gridCount; i++) {
      const x = padding + (i * (chartWidth - padding * 2)) / gridCount;
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={padding}
          x2={x}
          y2={chartHeight - padding}
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth="1"
        />
      );
    }
  }

  // Create gradient
  const gradientId = `area-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Grid */}
        {gridLines}
        
        {/* Area fill */}
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          className={animated ? 'transition-all duration-700 ease-out' : ''}
        />
        
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'transition-all duration-700 ease-out' : ''}
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            className={`opacity-0 hover:opacity-100 transition-opacity duration-200 ${animated ? 'transition-all duration-700 ease-out' : ''}`}
          >
            <title>{`${point.originalX}: ${point.originalY}`}</title>
          </circle>
        ))}
        
        {/* Y-axis labels */}
        {showYAxis && (
          <g className="text-xs fill-slate-400">
            {[0, 1, 2, 3, 4].map(i => {
              const y = padding + (i * (chartHeight - padding * 2)) / 4;
              const value = maxY - (i * yRange) / 4;
              return (
                <text
                  key={i}
                  x={padding - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-xs"
                >
                  {value.toFixed(0)}
                </text>
              );
            })}
          </g>
        )}
        
        {/* X-axis labels */}
        {showXAxis && (
          <g className="text-xs fill-slate-400">
            {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((point, index) => (
              <text
                key={index}
                x={point.x}
                y={chartHeight + 15}
                textAnchor="middle"
                className="text-xs"
              >
                {typeof point.originalX === 'string' 
                  ? point.originalX.substring(0, 6)
                  : point.originalX}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

export default AreaChart;