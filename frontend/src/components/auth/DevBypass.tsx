'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Key, User, Shield } from 'lucide-react';
import { useAuthBypass } from '@/lib/auth-bypass';
import { useToast } from '@/hooks/use-toast';

export function DevBypassComponent() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const authBypass = useAuthBypass();
  const { toast } = useToast();

  useEffect(() => {
    checkBypassStatus();
  }, []);

  const checkBypassStatus = async () => {
    try {
      const available = await authBypass.checkBypassAvailability();
      setIsAvailable(available);
      
      const authenticated = authBypass.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const user = authBypass.getCurrentUser();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Failed to check bypass status:', error);
    }
  };

  const handleBypass = async () => {
    setIsLoading(true);
    
    try {
      const result = await authBypass.performBypass();
      
      if (result.success) {
        setIsAuthenticated(true);
        setCurrentUser(result.data?.user);
        
        toast({
          title: "🔓 SSO Bypass Successful",
          description: `Logged in as ${result.data?.user.email} (${result.data?.user.role})`,
          duration: 3000,
        });
      } else {
        toast({
          title: "❌ Bypass Failed",
          description: result.error || "Failed to bypass SSO",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "❌ Connection Error",
        description: "Failed to connect to development API",
        variant: "destructive",
        duration: 3000,
      });
    }
    
    setIsLoading(false);
  };

  const handleLogout = () => {
    authBypass.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    
    toast({
      title: "👋 Logged Out",
      description: "Development authentication cleared",
      duration: 2000,
    });
  };

  const handleAutoLogin = async () => {
    setIsLoading(true);
    
    try {
      const success = await authBypass.autoLogin();
      
      if (success) {
        await checkBypassStatus();
        toast({
          title: "🚀 Auto-Login Successful",
          description: "Development authentication applied automatically",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "❌ Auto-Login Failed",
        description: "Could not auto-login in development mode",
        variant: "destructive",
        duration: 3000,
      });
    }
    
    setIsLoading(false);
  };

  if (!isAvailable) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SSO Authentication
          </CardTitle>
          <CardDescription>
            Production mode - SSO bypass not available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="w-full justify-center">
            Production Environment
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Development SSO Bypass
        </CardTitle>
        <CardDescription>
          Skip SSO authentication in development mode
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={isAuthenticated ? "default" : "outline"}>
            {isAuthenticated ? "Authenticated" : "Not Authenticated"}
          </Badge>
        </div>

        {/* Current User Info */}
        {isAuthenticated && currentUser && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Current User</span>
            </div>
            <div className="text-sm space-y-1">
              <div><strong>Email:</strong> {currentUser.email}</div>
              <div><strong>Role:</strong> {currentUser.role}</div>
              <div><strong>ID:</strong> {currentUser.id}</div>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Development Only:</strong> This bypass is only available in development mode and will not work in production.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isAuthenticated ? (
            <>
              <Button 
                onClick={handleBypass} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Bypassing..." : "🔓 Bypass SSO"}
              </Button>
              
              <Button 
                onClick={handleAutoLogin} 
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Auto-Login..." : "🚀 Auto-Login"}
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleLogout} 
              variant="destructive"
              className="w-full"
            >
              👋 Logout
            </Button>
          )}
        </div>

        {/* API Status */}
        <div className="text-xs text-muted-foreground text-center">
          Connected to: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api'}
        </div>
      </CardContent>
    </Card>
  );
}