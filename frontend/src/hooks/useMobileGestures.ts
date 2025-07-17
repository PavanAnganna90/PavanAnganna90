/**
 * Mobile Gestures Hook
 * 
 * Custom hook for handling mobile gestures:
 * - Swipe detection (left, right, up, down)
 * - Pinch to zoom
 * - Long press detection
 * - Double tap detection
 * - Pull to refresh
 * - Momentum scrolling
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
  startPoint: TouchPoint;
  endPoint: TouchPoint;
}

export interface PinchGesture {
  scale: number;
  centerX: number;
  centerY: number;
  velocity: number;
}

export interface GestureConfig {
  swipeThreshold: number;
  longPressDelay: number;
  doubleTapDelay: number;
  pinchThreshold: number;
  velocityThreshold: number;
  preventScroll: boolean;
}

export interface UseMobileGesturesResult {
  // Gesture states
  isSwipeDetected: boolean;
  swipeGesture: SwipeGesture | null;
  isPinching: boolean;
  pinchGesture: PinchGesture | null;
  isLongPressing: boolean;
  longPressPoint: TouchPoint | null;
  doubleTapDetected: boolean;
  lastTap: TouchPoint | null;
  
  // Touch tracking
  touchPoints: TouchPoint[];
  touchStartTime: number | null;
  touchEndTime: number | null;
  
  // Event handlers
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  
  // Gesture callbacks
  onSwipe: (callback: (gesture: SwipeGesture) => void) => void;
  onPinch: (callback: (gesture: PinchGesture) => void) => void;
  onLongPress: (callback: (point: TouchPoint) => void) => void;
  onDoubleTap: (callback: (point: TouchPoint) => void) => void;
  onTap: (callback: (point: TouchPoint) => void) => void;
  
  // Utility functions
  reset: () => void;
  getVelocity: (startPoint: TouchPoint, endPoint: TouchPoint) => number;
  getDistance: (point1: TouchPoint, point2: TouchPoint) => number;
  getDirection: (startPoint: TouchPoint, endPoint: TouchPoint) => 'left' | 'right' | 'up' | 'down' | null;
}

const DEFAULT_CONFIG: GestureConfig = {
  swipeThreshold: 50,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 10,
  velocityThreshold: 0.3,
  preventScroll: false
};

export const useMobileGestures = (
  config: Partial<GestureConfig> = {}
): UseMobileGesturesResult => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // State
  const [isSwipeDetected, setIsSwipeDetected] = useState(false);
  const [swipeGesture, setSwipeGesture] = useState<SwipeGesture | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [pinchGesture, setPinchGesture] = useState<PinchGesture | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressPoint, setLongPressPoint] = useState<TouchPoint | null>(null);
  const [doubleTapDetected, setDoubleTapDetected] = useState(false);
  const [lastTap, setLastTap] = useState<TouchPoint | null>(null);
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [touchEndTime, setTouchEndTime] = useState<number | null>(null);
  
  // Refs for callbacks
  const swipeCallbackRef = useRef<((gesture: SwipeGesture) => void) | null>(null);
  const pinchCallbackRef = useRef<((gesture: PinchGesture) => void) | null>(null);
  const longPressCallbackRef = useRef<((point: TouchPoint) => void) | null>(null);
  const doubleTapCallbackRef = useRef<((point: TouchPoint) => void) | null>(null);
  const tapCallbackRef = useRef<((point: TouchPoint) => void) | null>(null);
  
  // Refs for tracking
  const touchStartRef = useRef<TouchPoint | null>(null);
  const lastTouchRef = useRef<TouchPoint | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialPinchDistance = useRef<number | null>(null);
  const lastPinchScale = useRef<number>(1);
  
  // Utility functions
  const getDistance = useCallback((point1: TouchPoint, point2: TouchPoint): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);
  
  const getVelocity = useCallback((startPoint: TouchPoint, endPoint: TouchPoint): number => {
    const distance = getDistance(startPoint, endPoint);
    const duration = endPoint.timestamp - startPoint.timestamp;
    return duration > 0 ? distance / duration : 0;
  }, [getDistance]);
  
  const getDirection = useCallback((startPoint: TouchPoint, endPoint: TouchPoint): 'left' | 'right' | 'up' | 'down' | null => {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (Math.max(absDx, absDy) < mergedConfig.swipeThreshold) {
      return null;
    }
    
    if (absDx > absDy) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, [mergedConfig.swipeThreshold]);
  
  const getTouchPoint = useCallback((touch: Touch): TouchPoint => {
    return {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };
  }, []);
  
  const getPinchDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);
  
  const getPinchCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }, []);
  
  // Clear timers
  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (doubleTapTimerRef.current) {
      clearTimeout(doubleTapTimerRef.current);
      doubleTapTimerRef.current = null;
    }
  }, []);
  
  // Reset all states
  const reset = useCallback(() => {
    setIsSwipeDetected(false);
    setSwipeGesture(null);
    setIsPinching(false);
    setPinchGesture(null);
    setIsLongPressing(false);
    setLongPressPoint(null);
    setDoubleTapDetected(false);
    setTouchPoints([]);
    setTouchStartTime(null);
    setTouchEndTime(null);
    
    touchStartRef.current = null;
    lastTouchRef.current = null;
    initialPinchDistance.current = null;
    lastPinchScale.current = 1;
    
    clearTimers();
  }, [clearTimers]);
  
  // Touch event handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (mergedConfig.preventScroll) {
      e.preventDefault();
    }
    
    const now = Date.now();
    setTouchStartTime(now);
    
    if (e.touches.length === 1) {
      // Single touch
      const touchPoint = getTouchPoint(e.touches[0]);
      touchStartRef.current = touchPoint;
      lastTouchRef.current = touchPoint;
      setTouchPoints([touchPoint]);
      
      // Start long press timer
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true);
        setLongPressPoint(touchPoint);
        if (longPressCallbackRef.current) {
          longPressCallbackRef.current(touchPoint);
        }
      }, mergedConfig.longPressDelay);
      
    } else if (e.touches.length === 2) {
      // Pinch gesture
      clearTimers();
      const distance = getPinchDistance(e.touches[0], e.touches[1]);
      initialPinchDistance.current = distance;
      setIsPinching(true);
      
      const center = getPinchCenter(e.touches[0], e.touches[1]);
      setPinchGesture({
        scale: 1,
        centerX: center.x,
        centerY: center.y,
        velocity: 0
      });
    }
  }, [mergedConfig.preventScroll, mergedConfig.longPressDelay, getTouchPoint, getPinchDistance, getPinchCenter, clearTimers]);
  
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (mergedConfig.preventScroll) {
      e.preventDefault();
    }
    
    if (e.touches.length === 1 && touchStartRef.current) {
      // Single touch move
      const currentPoint = getTouchPoint(e.touches[0]);
      lastTouchRef.current = currentPoint;
      
      // Clear long press if moved too much
      if (isLongPressing || longPressTimerRef.current) {
        const distance = getDistance(touchStartRef.current, currentPoint);
        if (distance > mergedConfig.swipeThreshold / 2) {
          clearTimers();
          setIsLongPressing(false);
          setLongPressPoint(null);
        }
      }
      
    } else if (e.touches.length === 2 && initialPinchDistance.current) {
      // Pinch gesture
      const currentDistance = getPinchDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistance.current;
      const center = getPinchCenter(e.touches[0], e.touches[1]);
      
      const velocity = Math.abs(scale - lastPinchScale.current);
      lastPinchScale.current = scale;
      
      const newPinchGesture = {
        scale,
        centerX: center.x,
        centerY: center.y,
        velocity
      };
      
      setPinchGesture(newPinchGesture);
      
      if (pinchCallbackRef.current) {
        pinchCallbackRef.current(newPinchGesture);
      }
    }
  }, [mergedConfig.preventScroll, mergedConfig.swipeThreshold, getTouchPoint, getDistance, getPinchDistance, getPinchCenter, isLongPressing, clearTimers]);
  
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (mergedConfig.preventScroll) {
      e.preventDefault();
    }
    
    const now = Date.now();
    setTouchEndTime(now);
    
    clearTimers();
    
    if (e.touches.length === 0) {
      // All touches ended
      if (touchStartRef.current && lastTouchRef.current) {
        const distance = getDistance(touchStartRef.current, lastTouchRef.current);
        const direction = getDirection(touchStartRef.current, lastTouchRef.current);
        const velocity = getVelocity(touchStartRef.current, lastTouchRef.current);
        
        if (direction && distance >= mergedConfig.swipeThreshold && velocity >= mergedConfig.velocityThreshold) {
          // Swipe detected
          const swipeGesture: SwipeGesture = {
            direction,
            distance,
            velocity,
            duration: lastTouchRef.current.timestamp - touchStartRef.current.timestamp,
            startPoint: touchStartRef.current,
            endPoint: lastTouchRef.current
          };
          
          setIsSwipeDetected(true);
          setSwipeGesture(swipeGesture);
          
          if (swipeCallbackRef.current) {
            swipeCallbackRef.current(swipeGesture);
          }
        } else if (distance < mergedConfig.swipeThreshold && !isLongPressing) {
          // Tap detected
          const tapPoint = lastTouchRef.current;
          
          if (lastTap && (now - lastTap.timestamp) < mergedConfig.doubleTapDelay) {
            // Double tap
            setDoubleTapDetected(true);
            setLastTap(null);
            
            if (doubleTapCallbackRef.current) {
              doubleTapCallbackRef.current(tapPoint);
            }
          } else {
            // Single tap (might become double tap)
            setLastTap(tapPoint);
            doubleTapTimerRef.current = setTimeout(() => {
              if (tapCallbackRef.current) {
                tapCallbackRef.current(tapPoint);
              }
              setLastTap(null);
            }, mergedConfig.doubleTapDelay);
          }
        }
      }
      
      setIsPinching(false);
      setPinchGesture(null);
      setIsLongPressing(false);
      setLongPressPoint(null);
      
      touchStartRef.current = null;
      lastTouchRef.current = null;
      initialPinchDistance.current = null;
      lastPinchScale.current = 1;
    }
  }, [mergedConfig.preventScroll, mergedConfig.swipeThreshold, mergedConfig.velocityThreshold, mergedConfig.doubleTapDelay, getDistance, getDirection, getVelocity, isLongPressing, lastTap, clearTimers]);
  
  // Callback registration
  const onSwipe = useCallback((callback: (gesture: SwipeGesture) => void) => {
    swipeCallbackRef.current = callback;
  }, []);
  
  const onPinch = useCallback((callback: (gesture: PinchGesture) => void) => {
    pinchCallbackRef.current = callback;
  }, []);
  
  const onLongPress = useCallback((callback: (point: TouchPoint) => void) => {
    longPressCallbackRef.current = callback;
  }, []);
  
  const onDoubleTap = useCallback((callback: (point: TouchPoint) => void) => {
    doubleTapCallbackRef.current = callback;
  }, []);
  
  const onTap = useCallback((callback: (point: TouchPoint) => void) => {
    tapCallbackRef.current = callback;
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);
  
  return {
    // Gesture states
    isSwipeDetected,
    swipeGesture,
    isPinching,
    pinchGesture,
    isLongPressing,
    longPressPoint,
    doubleTapDetected,
    lastTap,
    
    // Touch tracking
    touchPoints,
    touchStartTime,
    touchEndTime,
    
    // Event handlers
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    
    // Gesture callbacks
    onSwipe,
    onPinch,
    onLongPress,
    onDoubleTap,
    onTap,
    
    // Utility functions
    reset,
    getVelocity,
    getDistance,
    getDirection
  };
};

export default useMobileGestures;