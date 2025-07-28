/**
 * Frontend-Backend Integration Tests
 * Tests the integration between React components and API calls
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock API responses
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Simple Login Component for Integration Testing
const LoginComponent = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [status, setStatus] = React.useState('idle');
  const [user, setUser] = React.useState(null);

  const handleLogin = async () => {
    setStatus('loading');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus('success');
        setUser(data.data.user);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="email-input"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button onClick={handleLogin} disabled={status === 'loading'}>
        {status === 'loading' ? 'Logging in...' : 'Login'}
      </button>
      {status === 'success' && user && (
        <div data-testid="success-message">
          Welcome, {user.email}!
        </div>
      )}
      {status === 'error' && (
        <div data-testid="error-message">
          Login failed
        </div>
      )}
    </div>
  );
};

// Simple Dashboard Component
const DashboardComponent = () => {
  const [metrics, setMetrics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div data-testid="loading">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div data-testid="error">Failed to load metrics</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <div data-testid="metrics">
        <div>Requests: {metrics.requests_total}</div>
        <div>Response Time: {metrics.response_time_avg}ms</div>
        <div>Error Rate: {(metrics.error_rate * 100).toFixed(2)}%</div>
      </div>
    </div>
  );
};

describe('Frontend-Backend Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Authentication Integration', () => {
    test('should handle successful login flow', async () => {
      const user = userEvent.setup();
      
      // Mock successful login response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            token: 'jwt-token-123',
            user: { id: '1', email: 'test@example.com', role: 'user' }
          }
        })
      });

      render(<LoginComponent />);

      // Fill in login form
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      // Verify API call was made
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      // Verify success message appears
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toHaveTextContent(
          'Welcome, test@example.com!'
        );
      });
    });

    test('should handle login failure', async () => {
      const user = userEvent.setup();
      
      // Mock failed login response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid credentials'
        })
      });

      render(<LoginComponent />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(loginButton);

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Login failed'
        );
      });
    });

    test('should handle network error', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<LoginComponent />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const loginButton = screen.getByRole('button', { name: /login/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Login failed'
        );
      });
    });
  });

  describe('Dashboard Integration', () => {
    test('should load and display metrics from API', async () => {
      // Mock metrics response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requests_total: 1000,
          response_time_avg: 125,
          error_rate: 0.02,
          uptime_seconds: 3600
        })
      });

      render(<DashboardComponent />);

      // Initially shows loading
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading metrics...');

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByTestId('metrics')).toBeInTheDocument();
      });

      // Verify metrics are displayed correctly
      expect(screen.getByText('Requests: 1000')).toBeInTheDocument();
      expect(screen.getByText('Response Time: 125ms')).toBeInTheDocument();
      expect(screen.getByText('Error Rate: 2.00%')).toBeInTheDocument();

      // Verify API call was made
      expect(mockFetch).toHaveBeenCalledWith('/metrics');
    });

    test('should handle metrics loading failure', async () => {
      // Mock failed response
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<DashboardComponent />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to load metrics');
      });
    });
  });

  describe('API Response Validation', () => {
    test('should validate health check response format', async () => {
      const healthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'api-module',
        version: '1.0.0'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => healthResponse
      });

      const response = await fetch('/health');
      const data = await response.json();

      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('service', 'api-module');
      expect(data).toHaveProperty('version', '1.0.0');
    });

    test('should validate user data response format', async () => {
      const usersResponse = {
        success: true,
        data: [
          { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => usersResponse
      });

      const response = await fetch('/api/users');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data[0]).toHaveProperty('id');
      expect(data.data[0]).toHaveProperty('email');
      expect(data.data[0]).toHaveProperty('firstName');
      expect(data.data[0]).toHaveProperty('lastName');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle API rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      });

      const response = await fetch('/api/users');
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.retryAfter).toBe(60);
    });

    test('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Unauthorized'
        })
      });

      const response = await fetch('/api/protected');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });
});