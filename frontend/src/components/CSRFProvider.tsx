'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CSRFContextType {
  csrfToken: string | null;
  refreshToken: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCSRFToken(data.csrfToken);
      } else {
        console.error('Failed to fetch CSRF token');
        setCSRFToken(null);
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      setCSRFToken(null);
    }
  };

  useEffect(() => {
    refreshToken();
  }, []);

  const value = {
    csrfToken,
    refreshToken
  };

  return (
    <CSRFContext.Provider value={value}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
}

/**
 * Hook for making CSRF-protected API calls
 */
export function useCSRFFetch() {
  const { csrfToken, refreshToken } = useCSRF();

  const csrfFetch = async (url: string, options: RequestInit = {}) => {
    if (!csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      await refreshToken();
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(csrfToken && { 'x-csrf-token': csrfToken })
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  };

  return csrfFetch;
}