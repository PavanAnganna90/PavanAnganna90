'use client';

import React from 'react';

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
  showLabels?: boolean;
  showPercentages?: boolean;
  centerContent?: React.ReactNode;
  animated?: boolean;
  className?: string;
}

export function DonutChart({
  data,
  size = 120,
  thickness = 16,
  showLabels = true,
  showPercentages = false,
  centerContent,
  animated = true,
  className = ''
}: DonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-slate-700/20 rounded-full ${className}`} style={{ width: size, height: size }}>
        <div className="text-slate-500 text-xs">No data</div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90; // Start from top

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -currentAngle * (circumference / 360);
          
          currentAngle += (percentage / 100) * 360;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={animated ? 'transition-all duration-700 ease-out' : ''}
              style={{
                transformOrigin: `${center}px ${center}px`
              }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      {centerContent && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            width: size - thickness * 2, 
            height: size - thickness * 2,
            top: thickness,
            left: thickness
          }}
        >
          {centerContent}
        </div>
      )}

      {/* Legend */}
      {showLabels && (
        <div className="absolute" style={{ top: size + 8, left: 0, width: size }}>
          <div className="space-y-1">
            {data.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              return (
                <div key={index} className="flex items-center text-xs">
                  <div 
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300 truncate flex-1">{item.label}</span>
                  {showPercentages && (
                    <span className="text-slate-400 ml-1">{percentage}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default DonutChart;