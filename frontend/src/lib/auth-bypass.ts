// Frontend SSO Bypass Utilities

export interface DevAuthResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    token: string;
    message: string;
    bypass: boolean;
  };
  error?: string;
}

export class AuthBypass {
  private static instance: AuthBypass;
  private apiUrl: string;

  private constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  public static getInstance(): AuthBypass {
    if (!AuthBypass.instance) {
      AuthBypass.instance = new AuthBypass();
    }
    return AuthBypass.instance;
  }

  /**
   * Check if SSO bypass is available in current environment
   */
  async isSSoBypasAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/sso-status`);
      const data = await response.json();
      
      return data.success && data.data.authType === 'bypass';
    } catch (error) {
      console.warn('Failed to check SSO bypass status:', error);
      return false;
    }
  }

  /**
   * Get development authentication token (bypasses SSO)
   */
  async getDevToken(): Promise<DevAuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/dev-token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: DevAuthResponse = await response.json();

      if (data.success && data.data?.token) {
        // Store token in localStorage for automatic use
        localStorage.setItem('auth_token', data.data.token);
        localStorage.setItem('auth_bypass', 'true');
        
        console.log('🔓 SSO bypass successful - development mode active');
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to development authentication',
      };
    }
  }

  /**
   * Auto-login in development mode
   */
  async autoLogin(): Promise<boolean> {
    const isBypassAvailable = await this.isSSoBypasAvailable();
    
    if (!isBypassAvailable) {
      return false;
    }

    const result = await this.getDevToken();
    return result.success;
  }

  /**
   * Check if user is authenticated via bypass
   */
  isAuthenticatedViaBpass(): boolean {
    const token = localStorage.getItem('auth_token');
    const bypassFlag = localStorage.getItem('auth_bypass');
    
    return !!(token && bypassFlag === 'true');
  }

  /**
   * Clear bypass authentication
   */
  clearBypassAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_bypass');
  }

  /**
   * Get current user from bypass token
   */
  getCurrentUser(): any | null {
    const token = localStorage.getItem('auth_token');
    
    if (!token) return null;

    try {
      // Decode JWT token (simple base64 decode for payload)
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error('Failed to decode auth token:', error);
      return null;
    }
  }
}

// React hook for SSO bypass
export function useAuthBypass() {
  const authBypass = AuthBypass.getInstance();

  const checkBypassAvailability = async () => {
    return await authBypass.isSSoBypasAvailable();
  };

  const performBypass = async () => {
    return await authBypass.getDevToken();
  };

  const autoLogin = async () => {
    return await authBypass.autoLogin();
  };

  const isAuthenticated = () => {
    return authBypass.isAuthenticatedViaBpass();
  };

  const getCurrentUser = () => {
    return authBypass.getCurrentUser();
  };

  const logout = () => {
    authBypass.clearBypassAuth();
  };

  return {
    checkBypassAvailability,
    performBypass,
    autoLogin,
    isAuthenticated,
    getCurrentUser,
    logout,
  };
}