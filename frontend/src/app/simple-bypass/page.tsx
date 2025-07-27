'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleBypassPage() {
  const [status, setStatus] = useState('checking...');
  const [token, setToken] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/auth/sso-status');
      const data = await response.json();
      
      if (data.success && data.data.authType === 'bypass') {
        setStatus('SSO bypass available');
      } else {
        setStatus('SSO bypass not available');
      }
    } catch (error) {
      setStatus('API not running');
      console.error('Status check failed:', error);
    }
  };

  const performBypass = async () => {
    try {
      setStatus('Bypassing...');
      
      const response = await fetch('http://localhost:3003/api/auth/dev-token');
      const data = await response.json();
      
      if (data.success && data.data?.token) {
        setToken(data.data.token);
        setUser(data.data.user);
        setStatus('✅ Bypass successful!');
        
        // Store token for future use
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('auth_bypass', 'true');
        
        alert(`SSO Bypassed! Logged in as: ${data.data.user.email} (${data.data.user.role})`);
      } else {
        setStatus('❌ Bypass failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('❌ Connection error');
      console.error('Bypass failed:', error);
    }
  };

  const testAPI = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        alert('No token found. Please bypass SSO first.');
        return;
      }

      const response = await fetch('http://localhost:3003/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`API Test Successful!\n\nUser: ${data.data.name}\nEmail: ${data.data.email}\nRole: ${data.data.role}`);
      } else {
        alert(`API Test Failed: ${data.error}`);
      }
    } catch (error) {
      alert(`API Test Error: ${error}`);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_bypass');
    setToken('');
    setUser(null);
    setStatus('Logged out');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px', 
      fontFamily: 'system-ui, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        margin: '0 auto', 
        background: 'rgba(255,255,255,0.1)', 
        padding: '30px', 
        borderRadius: '15px',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textAlign: 'center' }}>
          🔓 SSO Bypass Tool
        </h1>
        
        <p style={{ textAlign: 'center', marginBottom: '30px', opacity: 0.9 }}>
          Development authentication bypass
        </p>

        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '20px', 
          borderRadius: '10px', 
          marginBottom: '20px' 
        }}>
          <h3>Status</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{status}</p>
        </div>

        {user && (
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '20px', 
            borderRadius: '10px', 
            marginBottom: '20px' 
          }}>
            <h3>Current User</h3>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>ID:</strong> {user.id}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button
            onClick={checkStatus}
            style={{
              padding: '15px 25px',
              fontSize: '1.1rem',
              border: 'none',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            🔍 Check Status
          </button>

          <button
            onClick={performBypass}
            style={{
              padding: '15px 25px',
              fontSize: '1.1rem',
              border: 'none',
              borderRadius: '8px',
              background: '#4CAF50',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#45a049'}
            onMouseOut={(e) => e.target.style.background = '#4CAF50'}
          >
            🔓 Bypass SSO
          </button>

          <button
            onClick={testAPI}
            style={{
              padding: '15px 25px',
              fontSize: '1.1rem',
              border: 'none',
              borderRadius: '8px',
              background: '#2196F3',
              color: 'white',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#1976D2'}
            onMouseOut={(e) => e.target.style.background = '#2196F3'}
          >
            🧪 Test API
          </button>

          {user && (
            <button
              onClick={logout}
              style={{
                padding: '15px 25px',
                fontSize: '1.1rem',
                border: 'none',
                borderRadius: '8px',
                background: '#f44336',
                color: 'white',
                cursor: 'pointer',
                transition: 'background 0.3s'
              }}
              onMouseOver={(e) => e.target.style.background = '#d32f2f'}
              onMouseOut={(e) => e.target.style.background = '#f44336'}
            >
              👋 Logout
            </button>
          )}
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          <h4>Instructions:</h4>
          <ol style={{ marginLeft: '20px' }}>
            <li>Click "Check Status" to verify API connection</li>
            <li>Click "Bypass SSO" to authenticate as development user</li>
            <li>Click "Test API" to verify authentication works</li>
            <li>Use the token for other API calls</li>
          </ol>
        </div>

        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center', 
          fontSize: '0.8rem', 
          opacity: 0.7 
        }}>
          <p>API: http://localhost:3003/api</p>
          <p>Environment: Development Only</p>
        </div>
      </div>
    </div>
  );
}