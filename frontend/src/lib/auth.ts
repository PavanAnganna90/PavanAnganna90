/**
 * Secure Authentication Library
 * Handles token management with httpOnly cookies and secure practices
 */

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

class AuthService {
  private static instance: AuthService;
  private user: User | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get authentication token for WebSocket connections
   * Uses secure method instead of localStorage
   */
  async getWebSocketToken(): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/ws-token', {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get WebSocket token');
      }

      const { token } = await response.json();
      return token;
    } catch (error) {
      console.error('Error getting WebSocket token:', error);
      return null;
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const userData = await response.json();
      this.user = userData.user;
      this.scheduleTokenRefresh(userData.expiresIn);
      
      return this.user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  /**
   * Logout and clear all tokens
   */
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.user = null;
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { expiresIn } = await response.json();
      this.scheduleTokenRefresh(expiresIn);
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh 5 minutes before expiration
    const refreshTime = (expiresIn - 5 * 60) * 1000;
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  /**
   * Verify session on app start
   */
  async verifySession(): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      this.user = userData.user;
      this.scheduleTokenRefresh(userData.expiresIn);
      
      return this.user;
    } catch (error) {
      console.error('Session verification error:', error);
      return null;
    }
  }
}

export const authService = AuthService.getInstance();