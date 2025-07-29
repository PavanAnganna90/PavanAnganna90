'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import { useAuth } from '@/contexts/DashboardAuthContext';
import { useState } from 'react';

export default function ManualAuthPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [result, setResult] = useState('');

  const testAuthBypass = async () => {
    try {
      setResult('Testing auth bypass...');
      
      // Test the backend endpoint directly
      const response = await fetch('http://localhost:8000/api/auth/dev-token');
      const data = await response.json();
      
      if (data.success && data.data?.token) {
        // Store the token manually
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('auth_bypass', 'true');
        
        setResult('✅ Token stored successfully! Refresh page to see changes.');
      } else {
        setResult('❌ Failed to get token: ' + JSON.stringify(data));
      }
    } catch (error: any) {
      setResult('❌ Error: ' + error.message);
    }
  };

  const forceAuthState = () => {
    // Manually set a fake token for testing
    const fakeToken = 'dev-test-token-123';
    localStorage.setItem('auth_token', fakeToken);
    localStorage.setItem('auth_bypass', 'true');
    setResult('✅ Fake token set! Refresh page.');
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Manual Auth Test</h1>
      
      <div className="space-y-2">
        <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'None'}</p>
      </div>

      <div className="space-y-2">
        <button 
          onClick={testAuthBypass}
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
        >
          Test Auth Bypass
        </button>
        
        <button 
          onClick={forceAuthState}
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Force Auth State
        </button>
        
        <button 
          onClick={() => window.location.reload()}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Refresh Page
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 border rounded">
          <pre>{result}</pre>
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-bold">Environment Check:</h3>
        <p>NEXT_PUBLIC_ENABLE_DEV_AUTH: {process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH}</p>
        <p>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL}</p>
      </div>
    </div>
  );
}