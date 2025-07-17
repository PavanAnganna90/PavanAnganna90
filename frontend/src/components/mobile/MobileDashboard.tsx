/**
 * Mobile Dashboard Component
 * 
 * Mobile-optimized dashboard with:
 * - Swipe navigation between sections
 * - Touch-friendly controls
 * - Responsive card layouts
 * - Pull-to-refresh functionality
 * - Offline data synchronization
 * - Mobile-specific widgets
 * - Gesture-based interactions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { useSwipeable } from 'react-swipeable';

export interface MobileDashboardSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  widgets: DashboardWidget[];
  refreshable: boolean;
  offlineCapable: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'list' | 'status' | 'action';
  title: string;
  data: any;
  config: WidgetConfig;
  size: 'small' | 'medium' | 'large';
  priority: number;
  mobileOptimized: boolean;
}

export interface WidgetConfig {
  refreshInterval?: number;
  touchActions?: TouchAction[];
  swipeActions?: SwipeAction[];
  longPressAction?: string;
  doubleTapAction?: string;
}

export interface TouchAction {
  gesture: 'tap' | 'double-tap' | 'long-press' | 'swipe-left' | 'swipe-right';
  action: string;
  icon: string;
  color: string;
}

export interface SwipeAction {
  direction: 'left' | 'right' | 'up' | 'down';
  action: string;
  icon: string;
  color: string;
  threshold: number;
}

interface MobileDashboardProps {
  sections: MobileDashboardSection[];
  onWidgetAction: (widgetId: string, action: string) => void;
  onRefresh: (sectionId: string) => Promise<void>;
  className?: string;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  sections,
  onWidgetAction,
  onRefresh,
  className = ""
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [widgets, setWidgets] = useState<Record<string, DashboardWidget>>({});
  const [touchState, setTouchState] = useState<{
    startY: number;
    currentY: number;
    isDragging: boolean;
  }>({ startY: 0, currentY: 0, isDragging: false });

  const dashboardRef = useRef<HTMLDivElement>(null);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);

  // Initialize widgets
  useEffect(() => {
    const allWidgets = sections.reduce((acc, section) => {
      section.widgets.forEach(widget => {
        acc[widget.id] = widget;
      });
      return acc;
    }, {} as Record<string, DashboardWidget>);
    setWidgets(allWidgets);
  }, [sections]);

  // Swipe handlers for section navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentSection < sections.length - 1) {
        setCurrentSection(prev => prev + 1);
      }
    },
    onSwipedRight: () => {
      if (currentSection > 0) {
        setCurrentSection(prev => prev - 1);
      }
    },
    trackMouse: true,
    trackTouch: true
  });

  // Pull to refresh functionality
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchState({
      startY: touch.clientY,
      currentY: touch.clientY,
      isDragging: false
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const currentY = touch.clientY;
    
    setTouchState(prev => ({
      ...prev,
      currentY,
      isDragging: true
    }));

    // Calculate pull distance
    const pullDistance = Math.max(0, currentY - touchState.startY);
    const maxPullDistance = 100;
    const progress = Math.min(pullDistance / maxPullDistance, 1);
    
    setRefreshProgress(progress);

    // Apply visual feedback
    if (pullToRefreshRef.current) {
      pullToRefreshRef.current.style.transform = `translateY(${Math.min(pullDistance, maxPullDistance)}px)`;
      pullToRefreshRef.current.style.opacity = progress.toString();
    }
  }, [touchState.startY]);

  const handleTouchEnd = useCallback(async () => {
    if (refreshProgress >= 1 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh(sections[currentSection].id);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset pull to refresh state
    setTouchState({ startY: 0, currentY: 0, isDragging: false });
    setRefreshProgress(0);
    
    if (pullToRefreshRef.current) {
      pullToRefreshRef.current.style.transform = 'translateY(0)';
      pullToRefreshRef.current.style.opacity = '0';
    }
  }, [refreshProgress, isRefreshing, currentSection, sections, onRefresh]);

  // Widget interaction handlers
  const handleWidgetTap = useCallback((widget: DashboardWidget) => {
    const tapAction = widget.config.touchActions?.find(a => a.gesture === 'tap');
    if (tapAction) {
      onWidgetAction(widget.id, tapAction.action);
    }
  }, [onWidgetAction]);

  const handleWidgetDoubleTap = useCallback((widget: DashboardWidget) => {
    const doubleTapAction = widget.config.touchActions?.find(a => a.gesture === 'double-tap');
    if (doubleTapAction) {
      onWidgetAction(widget.id, doubleTapAction.action);
    }
  }, [onWidgetAction]);

  const handleWidgetLongPress = useCallback((widget: DashboardWidget) => {
    const longPressAction = widget.config.touchActions?.find(a => a.gesture === 'long-press');
    if (longPressAction) {
      onWidgetAction(widget.id, longPressAction.action);
    }
  }, [onWidgetAction]);

  // Render widget based on type
  const renderWidget = useCallback((widget: DashboardWidget) => {
    const baseClasses = `
      bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4
      touch-manipulation select-none cursor-pointer
      ${widget.size === 'small' ? 'h-24' : widget.size === 'medium' ? 'h-32' : 'h-40'}
    `;

    return (
      <div
        key={widget.id}
        className={baseClasses}
        onClick={() => handleWidgetTap(widget)}
        onDoubleClick={() => handleWidgetDoubleTap(widget)}
        onContextMenu={(e) => {
          e.preventDefault();
          handleWidgetLongPress(widget);
        }}
      >
        {widget.type === 'metric' && (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {widget.title}
              </h3>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(), 'HH:mm')}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {widget.data.value}
              </div>
              <div className={`text-sm ${
                widget.data.trend === 'up' ? 'text-green-600' :
                widget.data.trend === 'down' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {widget.data.change}
              </div>
            </div>
          </div>
        )}

        {widget.type === 'status' && (
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {widget.title}
              </h3>
              <div className={`w-3 h-3 rounded-full ${
                widget.data.status === 'healthy' ? 'bg-green-500' :
                widget.data.status === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {widget.data.message}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {format(new Date(widget.data.lastUpdated), 'HH:mm')}
            </div>
          </div>
        )}

        {widget.type === 'list' && (
          <div className="h-full flex flex-col">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 truncate">
              {widget.title}
            </h3>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {widget.data.items.slice(0, 3).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 truncate">
                      {item.name}
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {widget.data.items.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                +{widget.data.items.length - 3} more
              </div>
            )}
          </div>
        )}

        {widget.type === 'action' && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-3xl mb-2">{widget.data.icon}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white text-center">
              {widget.title}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              {widget.data.description}
            </div>
          </div>
        )}
      </div>
    );
  }, [handleWidgetTap, handleWidgetDoubleTap, handleWidgetLongPress]);

  if (sections.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No dashboard sections
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add some sections to get started
          </p>
        </div>
      </div>
    );
  }

  const currentSectionData = sections[currentSection];

  return (
    <div className={`h-full flex flex-col bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Pull to refresh indicator */}
      <div
        ref={pullToRefreshRef}
        className="absolute top-0 left-0 right-0 h-12 bg-blue-600 flex items-center justify-center z-10 opacity-0 transform -translate-y-full"
      >
        <div className="text-white text-sm font-medium">
          {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
        </div>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentSectionData.title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          <div className="text-3xl">{currentSectionData.icon}</div>
        </div>

        {/* Section navigation dots */}
        <div className="flex items-center justify-center mt-4 space-x-2">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSection(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSection
                  ? 'bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        ref={dashboardRef}
        className="flex-1 overflow-hidden"
        {...swipeHandlers}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(-${currentSection * 100}%)`,
            width: `${sections.length * 100}%`
          }}
        >
          {sections.map((section, sectionIndex) => (
            <div
              key={section.id}
              className="w-full h-full overflow-y-auto p-4"
              style={{ width: `${100 / sections.length}%` }}
            >
              <div className="grid grid-cols-2 gap-4">
                {section.widgets
                  .sort((a, b) => a.priority - b.priority)
                  .map(widget => renderWidget(widget))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center justify-around">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(index)}
              className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                index === currentSection
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="text-2xl mb-1">{section.icon}</div>
              <div className="text-xs font-medium">{section.title}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Refresh indicator */}
      {isRefreshing && (
        <div className="absolute top-16 left-0 right-0 h-1 bg-blue-600 animate-pulse"></div>
      )}
    </div>
  );
};

export default MobileDashboard;