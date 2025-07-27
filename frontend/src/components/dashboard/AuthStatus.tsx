'use client';

import React, { useEffect, useState } from 'react';

export function AuthStatus() {
  const [authInfo, setAuthInfo] = useState<any>(null);

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setAuthInfo({
          authenticated: true,
          token: token.substring(0, 20) + '...',
          user: userData
        });
      } catch (e) {
        setAuthInfo({
          authenticated: false,
          error: 'Invalid user data'
        });
      }
    } else {
      setAuthInfo({
        authenticated: false,
        message: 'No auth token found'
      });
    }
  }, []);

  if (!authInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-sm z-50 border">
      <h3 className="font-semibold mb-2">Auth Status</h3>
      {authInfo.authenticated ? (
        <div className="text-sm space-y-1">
          <p className="text-green-600">✅ Authenticated</p>
          <p><strong>User:</strong> {authInfo.user?.email}</p>
          <p><strong>Role:</strong> {authInfo.user?.role}</p>
          <p><strong>Token:</strong> {authInfo.token}</p>
        </div>
      ) : (
        <div className="text-sm">
          <p className="text-red-600">❌ Not Authenticated</p>
          <p>{authInfo.message || authInfo.error}</p>
        </div>
      )}
    </div>
  );
}