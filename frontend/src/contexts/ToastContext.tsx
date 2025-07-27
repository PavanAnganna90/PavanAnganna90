'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  // Convenience methods
  success: (message: string, options?: Partial<Toast>) => void;
  error: (message: string, options?: Partial<Toast>) => void;
  warning: (message: string, options?: Partial<Toast>) => void;
  info: (message: string, options?: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

  const addToast = (toastData: Omit<Toast, 'id'>) => {
    const toast: Toast = {
      id: generateId(),
      duration: 5000, // Default 5 seconds
      ...toastData,
    };

    setToasts(prev => {
      const newToasts = [toast, ...prev];
      // Limit the number of toasts
      return newToasts.slice(0, maxToasts);
    });

    // Auto-remove toast after duration (if specified)
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (message: string, options?: Partial<Toast>) => {
    addToast({ message, type: 'success', ...options });
  };

  const error = (message: string, options?: Partial<Toast>) => {
    addToast({ message, type: 'error', duration: 7000, ...options });
  };

  const warning = (message: string, options?: Partial<Toast>) => {
    addToast({ message, type: 'warning', ...options });
  };

  const info = (message: string, options?: Partial<Toast>) => {
    addToast({ message, type: 'info', ...options });
  };

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}