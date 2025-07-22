/**
 * Chart Theme Configuration for Orbit Platform Builder Design System
 * Provides Recharts-compatible themes with Platform Engineering color palette
 */

export const orbitChartColors = {
  primary: 'hsl(215, 85%, 55%)',      // Tech Blue
  secondary: 'hsl(180, 85%, 45%)',    // Teal accent
  accent: 'hsl(260, 85%, 55%)',       // Purple for highlights
  success: 'hsl(142, 85%, 45%)',      // Green for healthy status
  warning: 'hsl(35, 85%, 60%)',       // Orange for warnings
  error: 'hsl(0, 84%, 60%)',          // Red for errors
  // Supporting colors
  muted: 'hsl(215, 15%, 45%)',
  background: 'hsl(210, 20%, 98%)',
  foreground: 'hsl(215, 25%, 15%)',
} as const;

export const orbitChartTheme = {
  // Main chart series colors following Orbit palette
  colors: [
    orbitChartColors.primary,    // Tech Blue
    orbitChartColors.secondary,  // Teal accent
    orbitChartColors.success,    // Success green
    orbitChartColors.warning,    // Warning orange
    orbitChartColors.accent,     // Purple accent
    orbitChartColors.error,      // Error red
  ],
  
  // Grid and axis styling
  grid: {
    stroke: 'hsl(215, 20%, 88%)',
    strokeDasharray: '3 3',
    strokeOpacity: 0.3,
  },
  
  // Axis styling
  axis: {
    axisLine: {
      stroke: 'hsl(215, 20%, 88%)',
      strokeWidth: 1,
    },
    tickLine: {
      stroke: 'hsl(215, 20%, 88%)',
      strokeWidth: 1,
    },
    tick: {
      fill: orbitChartColors.muted,
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
      color: orbitChartColors.muted,
    },
  },
  
  // Tooltip styling
  tooltip: {
    contentStyle: {
      backgroundColor: 'white',
      border: `1px solid hsl(215, 20%, 88%)`,
      borderRadius: '8px',
      boxShadow: '0 2px 10px hsl(215 25% 15% / 0.1)',
      fontSize: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    labelStyle: {
      color: orbitChartColors.primary,
      fontWeight: 600,
    },
  },
} as const;

// Dark theme variant
export const orbitChartThemeDark = {
  ...orbitChartTheme,
  
  // Update colors for dark mode
  colors: [
    'hsl(215, 85%, 65%)',    // Brighter tech blue
    'hsl(180, 85%, 55%)',    // Brighter teal
    'hsl(142, 85%, 55%)',    // Brighter green
    'hsl(35, 85%, 65%)',     // Brighter orange
    'hsl(260, 85%, 65%)',    // Brighter purple
    'hsl(0, 84%, 65%)',      // Brighter red
  ],
  
  grid: {
    ...orbitChartTheme.grid,
    stroke: 'hsl(215, 20%, 20%)',
    strokeOpacity: 0.2,
  },
  
  axis: {
    axisLine: {
      stroke: 'hsl(215, 20%, 20%)',
      strokeWidth: 1,
    },
    tickLine: {
      stroke: 'hsl(215, 20%, 20%)',
      strokeWidth: 1,
    },
    tick: {
      fill: 'hsl(215, 15%, 65%)',
      fontSize: 12,
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  
  legend: {
    ...orbitChartTheme.legend,
    wrapperStyle: {
      ...orbitChartTheme.legend.wrapperStyle,
      color: 'hsl(215, 15%, 65%)',
    },
  },
  
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(215, 25%, 12%)',
      border: '1px solid hsl(215, 20%, 20%)',
      borderRadius: '8px',
      boxShadow: '0 2px 10px hsl(0 0% 0% / 0.3)',
      fontSize: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: 'hsl(215, 15%, 95%)',
    },
    labelStyle: {
      color: 'hsl(215, 85%, 65%)',
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
  const colors = isDark ? orbitChartThemeDark.colors : orbitChartTheme.colors;
  return colors[index % colors.length];
};

export const getChartTheme = (isDark = false) => {
  return isDark ? orbitChartThemeDark : orbitChartTheme;
};

// Backward compatibility exports
export const invaryChartColors = orbitChartColors;
export const invaryChartTheme = orbitChartTheme;
export const invaryChartThemeDark = orbitChartThemeDark;

// Export types for TypeScript support
export type ChartTheme = typeof orbitChartTheme;
export type ChartColors = typeof orbitChartColors;
export type ChartConfig = typeof chartConfigs;