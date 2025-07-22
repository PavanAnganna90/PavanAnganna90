'use client';

import React from 'react';
import { GitHubLoginButton } from '../../components/auth/GitHubLoginButton';
import { useOAuthProviders, useHealth } from '../../hooks/useApi';

/**
 * Test page for OAuth authentication flow
 */
export default function TestAuthPage() {
  const { data: providers, loading: providersLoading, error: providersError } = useOAuthProviders();
  const { data: health, loading: healthLoading, error: healthError } = useHealth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            OpsSight OAuth Test
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Testing authentication integration with backend
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 space-y-6">
          
          {/* Backend Health Status */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Backend Health</h3>
            {healthLoading ? (
              <div className="text-sm text-gray-500">Checking backend...</div>
            ) : healthError ? (
              <div className="text-sm text-red-600">❌ Backend Error: {healthError}</div>
            ) : health ? (
              <div className="space-y-1">
                <div className="text-sm text-green-600">✅ Status: {health.status}</div>
                <div className="text-sm text-gray-600">Service: {health.service}</div>
                <div className="text-sm text-gray-600">Version: {health.version}</div>
              </div>
            ) : null}
          </div>

          {/* OAuth Providers Status */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">OAuth Providers</h3>
            {providersLoading ? (
              <div className="text-sm text-gray-500">Loading providers...</div>
            ) : providersError ? (
              <div className="text-sm text-red-600">❌ OAuth Error: {providersError}</div>
            ) : providers ? (
              <div className="space-y-2">
                <div className="text-sm text-green-600">
                  ✅ {providers.enabled_count} of {providers.total_count} providers enabled
                </div>
                {providers.providers.map((provider) => (
                  <div key={provider.provider} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{provider.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      provider.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {provider.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* OAuth Login Test */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Authentication Test</h3>
            <div className="space-y-4">
              <GitHubLoginButton 
                variant="primary" 
                size="md"
                onLoginStart={() => console.log('OAuth flow started')}
              />
              <p className="text-xs text-gray-500">
                This will test the OAuth flow using the backend authorization endpoint
              </p>
            </div>
          </div>

          {/* Debug Information */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Debug Info</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div>Frontend URL: {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</div>
              <div>Backend URL: http://localhost:8000</div>
              <div>OAuth Endpoint: /api/v1/auth/oauth/github/authorize</div>
              <div>Callback URL: {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'N/A'}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}