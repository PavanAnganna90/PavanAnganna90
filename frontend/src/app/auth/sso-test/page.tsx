'use client';

import React, { useState, useEffect } from 'react';

export default function SSOTestPage() {
  const [status, setStatus] = useState('Loading...');
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testSSOConfig();
  }, []);

  const testSSOConfig = async () => {
    try {
      console.log('Fetching SSO config from http://localhost:3003/api/auth/sso/config');
      
      const response = await fetch('http://localhost:3003/api/auth/sso/config');
      const data = await response.json();
      
      console.log('Response:', data);
      
      if (data.success) {
        setConfig(data.data);
        setStatus('SSO is ' + (data.data.ssoEnabled ? 'ENABLED' : 'DISABLED'));
      } else {
        setError('Failed to load config');
        setStatus('Error loading config');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.toString());
      setStatus('Connection failed');
    }
  };

  const handleSSOLogin = async () => {
    try {
      setStatus('Initiating SSO login...');
      
      const response = await fetch('http://localhost:3003/api/auth/sso/login?redirect_url=/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setStatus('SSO login initiated! State: ' + data.data.state);
        
        // Simulate callback
        setTimeout(async () => {
          const callbackResponse = await fetch(`http://localhost:3003/api/auth/sso/callback?code=test_code&state=${data.data.state}`);
          const callbackData = await callbackResponse.json();
          
          if (callbackData.success) {
            localStorage.setItem('auth_token', callbackData.data.token);
            setStatus('✅ SSO Login Successful! User: ' + callbackData.data.user.email);
          }
        }, 1000);
      }
    } catch (err) {
      setError(err.toString());
      setStatus('SSO login failed');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>SSO Test Page</h1>
      
      <div style={{ marginTop: '20px' }}>
        <h2>Status: {status}</h2>
        
        {error && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            Error: {error}
          </div>
        )}
        
        {config && (
          <div style={{ marginTop: '20px', background: '#f0f0f0', padding: '10px' }}>
            <h3>SSO Configuration:</h3>
            <pre>{JSON.stringify(config, null, 2)}</pre>
          </div>
        )}
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={testSSOConfig}
            style={{ 
              padding: '10px 20px', 
              marginRight: '10px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Refresh Config
          </button>
          
          <button 
            onClick={handleSSOLogin}
            style={{ 
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Test SSO Login
          </button>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <a href="/simple-bypass" style={{ color: '#007bff' }}>
            Go to Development Bypass
          </a>
        </div>
      </div>
    </div>
  );
}