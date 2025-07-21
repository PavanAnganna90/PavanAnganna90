'use client';

import React from 'react';
import { useChartTheme } from '@/hooks/useChartTheme';

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
  barSpacing?: number;
}

export function BarChart({
  data,
  height = 120,
  showLabels = true,
  showValues = false,
  animated = true,
  className = '',
  barSpacing = 8
}: BarChartProps) {
  const { getColor } = useChartTheme();
  if (!data || data.length === 0) {
    return (
      <div className={`w-full bg-gray-100 dark:bg-invary-secondary/20 rounded ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full text-invary-neutral dark:text-gray-400 text-xs">
          No data
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const labelHeight = showLabels ? 20 : 0;
  const chartHeight = height - labelHeight;

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <div className="flex items-end justify-between h-full">
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const barColor = item.color || getColor(index);
          
          return (
            <div
              key={index}
              className="flex flex-col items-center flex-1"
              style={{ marginRight: index < data.length - 1 ? barSpacing : 0 }}
            >
              {/* Value label */}
              {showValues && (
                <div className="text-xs text-invary-neutral dark:text-gray-300 mb-1 font-medium">
                  {item.value}
                </div>
              )}
              
              {/* Bar */}
              <div className="relative w-full flex items-end">
                <div
                  className={`w-full rounded-t ${animated ? 'transition-all duration-500 ease-out' : ''}`}
                  style={{
                    height: barHeight,
                    backgroundColor: barColor,
                    backgroundImage: `linear-gradient(to top, ${barColor}, ${barColor}dd)`
                  }}
                >
                  {/* Shine effect */}
                  <div 
                    className="absolute inset-0 rounded-t-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)'
                    }}
                  />
                </div>
              </div>
              
              {/* Label */}
              {showLabels && (
                <div className="text-xs text-invary-neutral dark:text-gray-400 mt-2 text-center truncate w-full">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BarChart;