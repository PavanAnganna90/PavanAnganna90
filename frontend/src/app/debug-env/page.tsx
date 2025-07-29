'use client';

export default function DebugEnvPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      <div className="space-y-2">
        <p><strong>NEXT_PUBLIC_ENABLE_DEV_AUTH:</strong> {process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH || 'undefined'}</p>
        <p><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'undefined'}</p>
        <p><strong>NEXT_PUBLIC_ENABLE_DEMO_MODE:</strong> {process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE || 'undefined'}</p>
        <p><strong>NEXT_PUBLIC_DISABLE_SSO:</strong> {process.env.NEXT_PUBLIC_DISABLE_SSO || 'undefined'}</p>
      </div>
      
      <div className="mt-6">
        <h2 className="text-xl font-bold">Browser Environment Test</h2>
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
          onClick={async () => {
            try {
              const response = await fetch('http://localhost:8000/api/auth/dev-token');
              const data = await response.json();
              console.log('Dev token response:', data);
              alert(JSON.stringify(data, null, 2));
            } catch (error) {
              console.error('Error:', error);
              alert('Error: ' + error.message);
            }
          }}
        >
          Test Dev Token API
        </button>
      </div>
    </div>
  );
}