/**
 * Chart Theme Hook for Invary Design System
 * Provides chart theming utilities with dark mode support
 */

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { 
  invaryChartTheme, 
  invaryChartThemeDark, 
  invaryChartColors,
  getChartColor,
  getChartTheme,
  chartConfigs,
  type ChartTheme 
} from '@/styles/themes/chart-themes';

export interface UseChartThemeReturn {
  theme: ChartTheme;
  colors: string[];
  getColor: (index: number) => string;
  configs: typeof chartConfigs;
  isDark: boolean;
}

/**
 * Hook for accessing chart theme configuration
 * Automatically adapts to current theme mode
 */
export function useChartTheme(): UseChartThemeReturn {
  const { theme: currentTheme, systemTheme } = useTheme();
  
  const isDark = useMemo(() => {
    const resolvedTheme = currentTheme === 'system' ? systemTheme : currentTheme;
    return resolvedTheme === 'dark';
  }, [currentTheme, systemTheme]);

  const theme = useMemo(() => getChartTheme(isDark), [isDark]);
  
  const colors = useMemo(() => theme.colors, [theme]);
  
  const getColor = useMemo(() => 
    (index: number) => getChartColor(index, isDark), 
    [isDark]
  );

  return {
    theme,
    colors,
    getColor,
    configs: chartConfigs,
    isDark,
  };
}

/**
 * Hook for creating themed chart props
 * Returns common props that can be spread into Recharts components
 */
export function useThemedChartProps() {
  const { theme, colors, isDark } = useChartTheme();
  
  return useMemo(() => ({
    // Common props for all charts
    margin: { top: 20, right: 30, left: 20, bottom: 5 },
    
    // Grid props
    cartesianGrid: {
      ...theme.grid,
      vertical: false, // Clean horizontal lines only
    },
    
    // XAxis props
    xAxis: {
      ...theme.axis,
      axisLine: true,
      tickLine: true,
      tick: theme.axis.tick,
    },
    
    // YAxis props
    yAxis: {
      ...theme.axis,
      axisLine: false,
      tickLine: false,
      tick: theme.axis.tick,
    },
    
    // Legend props
    legend: theme.legend,
    
    // Tooltip props
    tooltip: {
      ...theme.tooltip,
      cursor: { 
        fill: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
      },
    },
    
    // Data colors
    colors,
  }), [theme, colors, isDark]);
}

/**
 * Hook for responsive chart dimensions
 * Provides breakpoint-aware chart sizing
 */
export function useResponsiveChart() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  return useMemo(() => ({
    width: isMobile ? '100%' : isTablet ? 400 : 500,
    height: isMobile ? 200 : isTablet ? 250 : 300,
    margin: isMobile 
      ? { top: 10, right: 15, left: 10, bottom: 5 }
      : { top: 20, right: 30, left: 20, bottom: 5 },
  }), [isMobile, isTablet]);
}

/**
 * Utility for creating gradient fills in charts
 */
export function useChartGradients() {
  const { colors, isDark } = useChartTheme();
  
  return useMemo(() => {
    const gradients = colors.map((color, index) => ({
      id: `gradient-${index}`,
      color1: color,
      color2: isDark 
        ? `${color}40` // 25% opacity for dark mode
        : `${color}60`, // 37.5% opacity for light mode
    }));
    
    return {
      gradients,
      getGradientId: (index: number) => `url(#gradient-${index})`,
    };
  }, [colors, isDark]);
}

// Re-export chart colors for convenience
export { invaryChartColors } from '@/styles/themes/chart-themes';