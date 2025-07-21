/**
 * Chart Theme Configuration for Invary Design System
 * Provides Recharts-compatible themes with Invary color palette
 */

export const invaryChartColors = {
  primary: '#434C62',
  secondary: '#4E4E62', 
  accent: '#FF7662',
  neutral: '#565656',
  // Supporting colors
  light: '#F8FAFC',
  gray: '#94A3B8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const invaryChartTheme = {
  // Main chart series colors following Invary palette
  colors: [
    invaryChartColors.primary,    // #434C62 - Primary blue
    invaryChartColors.secondary,  // #4E4E62 - Secondary blue
    invaryChartColors.accent,     // #FF7662 - Accent coral
    invaryChartColors.neutral,    // #565656 - Neutral gray
    invaryChartColors.success,    // #22C55E - Success green
    invaryChartColors.warning,    // #F59E0B - Warning orange
  ],
  
  // Grid and axis styling
  grid: {
    stroke: '#E2E8F0',
    strokeDasharray: '3 3',
    strokeOpacity: 0.3,
  },
  
  // Axis styling
  axis: {
    axisLine: {
      stroke: '#CBD5E1',
      strokeWidth: 1,
    },
    tickLine: {
      stroke: '#CBD5E1',
      strokeWidth: 1,
    },
    tick: {
      fill: invaryChartColors.neutral,
      fontSize: 12,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  
  // Legend styling
  legend: {
    iconType: 'circle' as const,
    wrapperStyle: {
      fontSize: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: invaryChartColors.neutral,
    },
  },
  
  // Tooltip styling
  tooltip: {
    contentStyle: {
      backgroundColor: 'white',
      border: `1px solid ${invaryChartColors.gray}`,
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(67, 76, 98, 0.1)',
      fontSize: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    labelStyle: {
      color: invaryChartColors.primary,
      fontWeight: 600,
    },
  },
} as const;

// Dark theme variant
export const invaryChartThemeDark = {
  ...invaryChartTheme,
  
  grid: {
    ...invaryChartTheme.grid,
    stroke: '#374151',
    strokeOpacity: 0.2,
  },
  
  axis: {
    axisLine: {
      stroke: '#4B5563',
      strokeWidth: 1,
    },
    tickLine: {
      stroke: '#4B5563',
      strokeWidth: 1,
    },
    tick: {
      fill: '#9CA3AF',
      fontSize: 12,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  
  legend: {
    ...invaryChartTheme.legend,
    wrapperStyle: {
      ...invaryChartTheme.legend.wrapperStyle,
      color: '#9CA3AF',
    },
  },
  
  tooltip: {
    contentStyle: {
      backgroundColor: invaryChartColors.primary,
      border: `1px solid ${invaryChartColors.secondary}`,
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      fontSize: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: 'white',
    },
    labelStyle: {
      color: 'white',
      fontWeight: 600,
    },
  },
} as const;

// Specialized chart configurations
export const chartConfigs = {
  // Line chart specific styling
  lineChart: {
    strokeWidth: 2,
    dot: {
      r: 4,
      strokeWidth: 2,
    },
    activeDot: {
      r: 6,
      strokeWidth: 0,
    },
  },
  
  // Bar chart specific styling
  barChart: {
    radius: [4, 4, 0, 0], // Rounded top corners
    margin: { top: 20, right: 30, left: 20, bottom: 5 },
  },
  
  // Area chart specific styling
  areaChart: {
    fillOpacity: 0.6,
    strokeWidth: 2,
  },
  
  // Donut chart specific styling
  donutChart: {
    innerRadius: 60,
    outerRadius: 100,
    paddingAngle: 2,
    cornerRadius: 4,
  },
} as const;

// Color utilities for dynamic theming
export const getChartColor = (index: number, isDark = false) => {
  const colors = isDark ? invaryChartThemeDark.colors : invaryChartTheme.colors;
  return colors[index % colors.length];
};

export const getChartTheme = (isDark = false) => {
  return isDark ? invaryChartThemeDark : invaryChartTheme;
};

// Export types for TypeScript support
export type ChartTheme = typeof invaryChartTheme;
export type ChartColors = typeof invaryChartColors;
export type ChartConfig = typeof chartConfigs;