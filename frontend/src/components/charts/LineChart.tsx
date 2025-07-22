'use client';

import React, { useMemo } from 'react';
import { useChartTheme } from '@/hooks/useChartTheme';
import { 
  sanitizeLineChartData, 
  sanitizeChartProps, 
  validationMonitor,
  ChartValidationError 
} from '@/lib/chartValidation';

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

export const LineChart = React.memo(function LineChart(props: LineChartProps) {
  const { getColor } = useChartTheme();
  
  // Validate and sanitize props
  const {
    data: rawData,
    height = 40,
    color,
    strokeWidth = 2,
    showDots = false,
    animated = true,
    className = '',
    colorIndex = 0
  } = useMemo(() => {
    return validationMonitor.measureValidation('LineChart', () => {
      try {
        const sanitizedProps = sanitizeChartProps(props);
        const sanitizedData = sanitizeLineChartData(props.data);
        
        return {
          ...props,
          ...sanitizedProps,
          data: sanitizedData
        };
      } catch (error) {
        if (error instanceof ChartValidationError) {
          console.error('LineChart validation error:', error);
          // Return safe defaults
          return {
            ...props,
            data: [],
            height: 40,
            strokeWidth: 2,
            showDots: false,
            animated: true,
            className: '',
            colorIndex: 0
          };
        }
        throw error;
      }
    });
  }, [props]);

  const data = rawData;
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

  // Memoize expensive path calculations
  const { pathData, points } = useMemo(() => {
    const width = 100; // Use percentage width
    const padding = 2;
    const stepX = (width - padding * 2) / (data.length - 1);
    
    const calculatedPoints = data.map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
      return { x, y, coord: `${x},${y}` };
    });

    const pathData = `M ${calculatedPoints.map(p => p.coord).join(' L ')}`;
    
    return { pathData, points: calculatedPoints };
  }, [data, height, minValue, range]);

  // Create stable gradient ID to prevent re-rendering
  const gradientId = useMemo(() => 
    `gradient-${colorIndex}-${chartColor.replace('#', '')}`, 
    [colorIndex, chartColor]
  );

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
          d={`${pathData} L ${points[points.length - 1]?.x || 0},${height - 2} L ${points[0]?.x || 0},${height - 2} Z`}
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
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill={chartColor}
            className={animated ? 'transition-all duration-300 ease-in-out' : ''}
          />
        ))}
      </svg>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for array data
  if (prevProps.data.length !== nextProps.data.length) return false;
  
  const dataEqual = prevProps.data.every((val, idx) => val === nextProps.data[idx]);
  
  return (
    dataEqual &&
    prevProps.height === nextProps.height &&
    prevProps.color === nextProps.color &&
    prevProps.strokeWidth === nextProps.strokeWidth &&
    prevProps.showDots === nextProps.showDots &&
    prevProps.animated === nextProps.animated &&
    prevProps.className === nextProps.className &&
    prevProps.colorIndex === nextProps.colorIndex
  );
});

export default LineChart;