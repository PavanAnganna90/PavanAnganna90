'use client';

import React, { useState, useEffect } from 'react';

export default function SSOPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSSOLogin = async (provider: string) => {
    setLoading(true);
    setMessage(`Logging in with ${provider}...`);
    
    try {
      // 1. Initiate SSO
      const response = await fetch('http://localhost:3003/api/auth/sso/login?redirect_url=/dashboard');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'SSO initiation failed');
      }
      
      // 2. Simulate SSO callback
      setTimeout(async () => {
        const callbackResponse = await fetch(`http://localhost:3003/api/auth/sso/callback?code=demo_${provider}_code&state=${data.data.state}`);
        const callbackData = await callbackResponse.json();
        
        if (callbackData.success) {
          localStorage.setItem('auth_token', callbackData.data.token);
          localStorage.setItem('user', JSON.stringify(callbackData.data.user));
          setMessage(`✅ Logged in as ${callbackData.data.user.email}`);
          
          // Redirect after 2 seconds
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        } else {
          throw new Error(callbackData.error || 'Authentication failed');
        }
      }, 1000);
      
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    window.location.href = '/simple-bypass';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Sign In</h1>
          <p className="text-gray-600">Choose your authentication method</p>
        </div>
        
        <div className="space-y-4">
          {/* GitHub SSO */}
          <button
            onClick={() => handleSSOLogin('github')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
          
          {/* Enterprise SAML */}
          <button
            onClick={() => handleSSOLogin('saml')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Continue with Enterprise SAML
          </button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>
          
          {/* Development Bypass */}
          <button
            onClick={handleDevBypass}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Development Mode
          </button>
        </div>
        
        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-3 rounded-lg text-center ${
            message.includes('✅') ? 'bg-green-100 text-green-700' : 
            message.includes('❌') ? 'bg-red-100 text-red-700' : 
            'bg-blue-100 text-blue-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}