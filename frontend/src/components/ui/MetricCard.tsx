import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  status?: 'success' | 'warning' | 'error' | 'info';
  icon: LucideIcon;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

export const MetricCard = React.memo<MetricCardProps>(function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  status,
  icon: Icon,
  description,
  isLoading = false,
  className
}) {
  const getChangeStyles = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'negative':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getStatusStyles = () => {
    if (!status) return '';
    
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10';
      case 'error':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
      case 'info':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700',
        className
      )}>
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200',
      status && 'border-l-4',
      getStatusStyles(),
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {value}
          </p>
          
          {description && (
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">
              {description}
            </p>
          )}
          
          {change && (
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              getChangeStyles()
            )}>
              {changeType === 'positive' && <TrendingUp className="h-3 w-3" />}
              {changeType === 'negative' && <TrendingDown className="h-3 w-3" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg flex-shrink-0">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
});

export default MetricCard;