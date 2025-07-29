'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/DashboardAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogIn, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DevAuthBypass() {
  const { login, isAuthenticated, user } = useAuth();
  const isDevelopment = process.env.NEXT_PUBLIC_ENVIRONMENT === 'development';
  const isDevAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';

  useEffect(() => {
    // Auto-login in development if not authenticated
    if (isDevelopment && isDevAuthEnabled && !isAuthenticated) {
      handleDevLogin();
    }
  }, [isDevelopment, isDevAuthEnabled, isAuthenticated]);

  const handleDevLogin = async () => {
    try {
      // Use demo credentials for development
      await login({
        email: 'dev@opssight.local',
        password: 'dev-password'
      });
    } catch (error) {
      console.error('Dev login failed:', error);
      // Try alternative demo endpoint
      try {
        const response = await fetch('http://localhost:8000/auth/demo-token', {
          method: 'POST'
        });
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          window.location.reload();
        }
      } catch (demoError) {
        console.error('Demo token fetch failed:', demoError);
      }
    }
  };

  if (!isDevelopment || !isDevAuthEnabled) {
    return null;
  }

  if (isAuthenticated && user) {
    return (
      <Alert className="mb-4">
        <User className="h-4 w-4" />
        <AlertTitle>Development Mode</AlertTitle>
        <AlertDescription>
          Logged in as: {user.email} ({user.role})
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Development Authentication</CardTitle>
        <CardDescription>
          Quick access for local development
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Development Mode</AlertTitle>
          <AlertDescription>
            Authentication bypass is enabled for local development.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <Button 
            onClick={handleDevLogin} 
            className="w-full"
            size="lg"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Quick Dev Login
          </Button>
          
          <div className="text-sm text-muted-foreground text-center">
            This will log you in as an admin user with full access to all features.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
