/**
 * Chart Data Validation Library
 * Provides schema validation and sanitization for chart components
 */

import { z } from 'zod';

// Validation schemas
export const LineChartDataSchema = z.array(z.number().finite().min(-1000000).max(1000000));

export const BarChartDataItemSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.number().finite().min(0).max(1000000),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
});

export const BarChartDataSchema = z.array(BarChartDataItemSchema).min(1).max(100);

export const ChartPropsSchema = z.object({
  height: z.number().int().min(20).max(1000).optional(),
  className: z.string().max(200).optional(),
  animated: z.boolean().optional(),
  strokeWidth: z.number().min(0.5).max(10).optional(),
  showDots: z.boolean().optional(),
  showLabels: z.boolean().optional(),
  showValues: z.boolean().optional(),
  colorIndex: z.number().int().min(0).max(20).optional(),
  barSpacing: z.number().min(0).max(50).optional()
});

// Error types
export class ChartValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown,
    public validationErrors: z.ZodError['issues']
  ) {
    super(message);
    this.name = 'ChartValidationError';
  }
}

// Validation functions
export function validateLineChartData(data: unknown): number[] {
  try {
    return LineChartDataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ChartValidationError(
        'Invalid line chart data format',
        'data',
        data,
        error.issues
      );
    }
    throw error;
  }
}

export function validateBarChartData(data: unknown): Array<{ label: string; value: number; color?: string }> {
  try {
    return BarChartDataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ChartValidationError(
        'Invalid bar chart data format',
        'data',
        data,
        error.issues
      );
    }
    throw error;
  }
}

export function validateChartProps(props: unknown): Record<string, any> {
  try {
    return ChartPropsSchema.parse(props);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ChartValidationError(
        'Invalid chart props',
        'props',
        props,
        error.issues
      );
    }
    throw error;
  }
}

// Sanitization functions
export function sanitizeLineChartData(data: unknown): number[] {
  if (!Array.isArray(data)) {
    console.warn('Line chart data is not an array, returning empty array');
    return [];
  }

  return data
    .filter((item): item is number => typeof item === 'number' && isFinite(item))
    .map(value => Math.max(-1000000, Math.min(1000000, value))) // Clamp values
    .slice(0, 1000); // Limit array size
}

export function sanitizeBarChartData(data: unknown): Array<{ label: string; value: number; color?: string }> {
  if (!Array.isArray(data)) {
    console.warn('Bar chart data is not an array, returning empty array');
    return [];
  }

  return data
    .filter((item): item is Record<string, any> => 
      typeof item === 'object' && 
      item !== null && 
      typeof item.label === 'string' && 
      typeof item.value === 'number' &&
      isFinite(item.value)
    )
    .map(item => ({
      label: String(item.label).slice(0, 50), // Truncate long labels
      value: Math.max(0, Math.min(1000000, item.value)), // Clamp positive values
      color: typeof item.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(item.color) 
        ? item.color 
        : undefined
    }))
    .slice(0, 100); // Limit array size
}

export function sanitizeChartProps(props: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  // Height validation
  if (typeof props.height === 'number' && isFinite(props.height)) {
    sanitized.height = Math.max(20, Math.min(1000, props.height));
  }

  // String props
  if (typeof props.className === 'string') {
    sanitized.className = props.className.slice(0, 200);
  }

  // Boolean props
  if (typeof props.animated === 'boolean') {
    sanitized.animated = props.animated;
  }
  if (typeof props.showDots === 'boolean') {
    sanitized.showDots = props.showDots;
  }
  if (typeof props.showLabels === 'boolean') {
    sanitized.showLabels = props.showLabels;
  }
  if (typeof props.showValues === 'boolean') {
    sanitized.showValues = props.showValues;
  }

  // Numeric props
  if (typeof props.strokeWidth === 'number' && isFinite(props.strokeWidth)) {
    sanitized.strokeWidth = Math.max(0.5, Math.min(10, props.strokeWidth));
  }
  if (typeof props.colorIndex === 'number' && isFinite(props.colorIndex)) {
    sanitized.colorIndex = Math.max(0, Math.min(20, Math.floor(props.colorIndex)));
  }
  if (typeof props.barSpacing === 'number' && isFinite(props.barSpacing)) {
    sanitized.barSpacing = Math.max(0, Math.min(50, props.barSpacing));
  }

  // Color validation
  if (typeof props.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(props.color)) {
    sanitized.color = props.color;
  }

  return sanitized;
}

// Type guards
export function isValidLineChartData(data: unknown): data is number[] {
  try {
    validateLineChartData(data);
    return true;
  } catch {
    return false;
  }
}

export function isValidBarChartData(data: unknown): data is Array<{ label: string; value: number; color?: string }> {
  try {
    validateBarChartData(data);
    return true;
  } catch {
    return false;
  }
}

// Development mode validation helpers
export function createChartDataValidator<T>(
  schema: z.ZodSchema<T>,
  componentName: string
) {
  return (data: unknown): T => {
    if (process.env.NODE_ENV === 'development') {
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(`${componentName} validation failed:`, {
            component: componentName,
            data,
            errors: error.issues.map(issue => ({
              path: issue.path.join('.'),
              message: issue.message,
              received: issue.received
            }))
          });
          
          // In development, throw detailed error
          throw new ChartValidationError(
            `${componentName} received invalid data`,
            'data',
            data,
            error.issues
          );
        }
      }
    }
    
    // In production, attempt sanitization
    if (schema === LineChartDataSchema) {
      return sanitizeLineChartData(data) as T;
    } else if (schema === BarChartDataSchema) {
      return sanitizeBarChartData(data) as T;
    }
    
    return data as T;
  };
}

// Performance monitoring for validation
export class ValidationPerformanceMonitor {
  private static instance: ValidationPerformanceMonitor;
  private validationTimes: Map<string, number[]> = new Map();

  private constructor() {}

  static getInstance(): ValidationPerformanceMonitor {
    if (!ValidationPerformanceMonitor.instance) {
      ValidationPerformanceMonitor.instance = new ValidationPerformanceMonitor();
    }
    return ValidationPerformanceMonitor.instance;
  }

  measureValidation<T>(componentName: string, validationFn: () => T): T {
    const start = performance.now();
    const result = validationFn();
    const duration = performance.now() - start;

    if (!this.validationTimes.has(componentName)) {
      this.validationTimes.set(componentName, []);
    }
    
    const times = this.validationTimes.get(componentName)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Log performance warning if validation is slow
    if (duration > 10) {
      console.warn(`Slow validation detected for ${componentName}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  getStats(): Record<string, { avg: number; max: number; count: number }> {
    const stats: Record<string, { avg: number; max: number; count: number }> = {};

    this.validationTimes.forEach((times, componentName) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b) / times.length;
        const max = Math.max(...times);
        stats[componentName] = { avg, max, count: times.length };
      }
    });

    return stats;
  }
}

export const validationMonitor = ValidationPerformanceMonitor.getInstance();