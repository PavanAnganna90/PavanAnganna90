'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import { useAuth } from '@/contexts/DashboardAuthContext';
import { useEffect, useState } from 'react';

export default function AuthDebugPage() {
  const { isAuthenticated, user, isLoading, error } = useAuth();
  const [envCheck, setEnvCheck] = useState('');

  useEffect(() => {
    // Log environment variables
    const devAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    console.log('Environment variables:');
    console.log('NEXT_PUBLIC_ENABLE_DEV_AUTH:', devAuth);
    console.log('NEXT_PUBLIC_API_URL:', apiUrl);
    
    setEnvCheck(`DEV_AUTH: ${devAuth}, API_URL: ${apiUrl}`);
    
    // Log auth state changes
    console.log('Auth state:', { isAuthenticated, user, isLoading, error });
  }, [isAuthenticated, user, isLoading, error]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Auth Debug Page</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold">Environment Variables:</h3>
        <p>{envCheck}</p>
      </div>
      
      <div className="bg-blue-100 p-4 rounded">
        <h3 className="font-bold">Auth State:</h3>
        <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        <p><strong>Error:</strong> {error || 'None'}</p>
        <p><strong>User:</strong></p>
        <pre className="text-sm">{user ? JSON.stringify(user, null, 2) : 'null'}</pre>
      </div>

      <div className="bg-green-100 p-4 rounded">
        <h3 className="font-bold">Manual Test:</h3>
        <p>Check browser console for detailed logs</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}