'use client';

import React, { useMemo } from 'react';
import { useChartTheme } from '@/hooks/useChartTheme';
import { 
  sanitizeBarChartData, 
  sanitizeChartProps, 
  validationMonitor,
  ChartValidationError 
} from '@/lib/chartValidation';

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
  barSpacing?: number;
}

export const BarChart = React.memo(function BarChart(props: BarChartProps) {
  const { getColor } = useChartTheme();
  
  // Validate and sanitize props
  const {
    data: rawData,
    height = 120,
    showLabels = true,
    showValues = false,
    animated = true,
    className = '',
    barSpacing = 8
  } = useMemo(() => {
    return validationMonitor.measureValidation('BarChart', () => {
      try {
        const sanitizedProps = sanitizeChartProps(props);
        const sanitizedData = sanitizeBarChartData(props.data);
        
        return {
          ...props,
          ...sanitizedProps,
          data: sanitizedData
        };
      } catch (error) {
        if (error instanceof ChartValidationError) {
          console.error('BarChart validation error:', error);
          // Return safe defaults
          return {
            ...props,
            data: [],
            height: 120,
            showLabels: true,
            showValues: false,
            animated: true,
            className: '',
            barSpacing: 8
          };
        }
        throw error;
      }
    });
  }, [props]);

  const data = rawData;
  
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
}, (prevProps, nextProps) => {
  // Custom comparison for array data
  if (prevProps.data.length !== nextProps.data.length) return false;
  
  const dataEqual = prevProps.data.every((item, idx) => {
    const nextItem = nextProps.data[idx];
    return item.label === nextItem.label && 
           item.value === nextItem.value && 
           item.color === nextItem.color;
  });
  
  return (
    dataEqual &&
    prevProps.height === nextProps.height &&
    prevProps.showLabels === nextProps.showLabels &&
    prevProps.showValues === nextProps.showValues &&
    prevProps.animated === nextProps.animated &&
    prevProps.className === nextProps.className &&
    prevProps.barSpacing === nextProps.barSpacing
  );
});

export default BarChart;