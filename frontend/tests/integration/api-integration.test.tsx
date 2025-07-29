import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AuthProvider } from '@/contexts/DashboardAuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

/**
 * Frontend API Integration Tests
 * Tests the integration between React components and API endpoints
 */

// Mock API server
const server = setupServer(
  // Mock dashboard stats endpoint
  rest.get('http://localhost:3003/api/dashboard/stats', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          users: {
            total: 150,
            active: 120,
            growth: 12.5
          },
          posts: {
            total: 45,
            published: 40,
            drafts: 5,
            thisMonth: 8
          },
          engagement: {
            totalViews: 5420,
            totalComments: 234,
            avgViewsPerPost: 120.4,
            topPosts: [
              {
                id: '1',
                title: 'Getting Started with React',
                viewCount: 245,
                commentCount: 12,
                status: 'PUBLISHED'
              },
              {
                id: '2',
                title: 'Advanced TypeScript Tips',
                viewCount: 189,
                commentCount: 8,
                status: 'PUBLISHED'
              }
            ]
          }
        }
      })
    );
  }),

  // Mock activity logs endpoint
  rest.get('http://localhost:3003/api/dashboard/activity', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          data: [
            {
              id: '1',
              action: 'CREATE',
              resource: 'POST',
              user: {
                firstName: 'John',
                lastName: 'Doe'
              },
              createdAt: new Date().toISOString()
            },
            {
              id: '2',
              action: 'UPDATE',
              resource: 'USER',
              user: {
                firstName: 'Jane',
                lastName: 'Smith'
              },
              createdAt: new Date(Date.now() - 3600000).toISOString()
            }
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        }
      })
    );
  }),

  // Mock users endpoint
  rest.get('http://localhost:3003/api/users', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          data: [
            {
              id: '1',
              email: 'john@example.com',
              firstName: 'John',
              lastName: 'Doe',
              role: 'USER',
              createdAt: new Date().toISOString()
            },
            {
              id: '2',
              email: 'jane@example.com',
              firstName: 'Jane',
              lastName: 'Smith',
              role: 'ADMIN',
              createdAt: new Date().toISOString()
            }
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        }
      })
    );
  }),

  // Mock posts endpoint
  rest.get('http://localhost:3003/api/posts', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          data: [
            {
              id: '1',
              title: 'Getting Started with React',
              content: 'This is a comprehensive guide...',
              status: 'PUBLISHED',
              authorId: '1',
              viewCount: 245,
              createdAt: new Date().toISOString()
            },
            {
              id: '2',
              title: 'Advanced TypeScript Tips',
              content: 'Learn advanced TypeScript...',
              status: 'PUBLISHED',
              authorId: '2',
              viewCount: 189,
              createdAt: new Date().toISOString()
            }
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        }
      })
    );
  })
);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthProvider>
  );
};

describe('API Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Dashboard Component Integration', () => {
    test('should load and display dashboard stats from API', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for API data to load
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total users
      });

      // Verify stats are displayed
      expect(screen.getByText('40')).toBeInTheDocument(); // Published posts
      expect(screen.getByText('5,420')).toBeInTheDocument(); // Total views
      expect(screen.getByText('4.3%')).toBeInTheDocument(); // Engagement rate
    });

    test('should display activity logs from API', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Wait for activity logs to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText(/created a post/i)).toBeInTheDocument();
      expect(screen.getByText(/updated a user/i)).toBeInTheDocument();
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error
      server.use(
        rest.get('http://localhost:3003/api/dashboard/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              success: false,
              error: 'Internal server error'
            })
          );
        })
      );

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Should handle error without crashing
      await waitFor(() => {
        // Component should still be rendered
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Should show error message or fallback UI
      // (Implementation specific - adjust based on your error handling)
    });

    test('should refresh data when refresh button is clicked', async () => {
      let requestCount = 0;
      
      server.use(
        rest.get('http://localhost:3003/api/dashboard/stats', (req, res, ctx) => {
          requestCount++;
          return res(
            ctx.json({
              success: true,
              data: {
                users: { total: 150 + requestCount, active: 120, growth: 12.5 },
                posts: { total: 45, published: 40, drafts: 5, thisMonth: 8 },
                engagement: {
                  totalViews: 5420,
                  totalComments: 234,
                  avgViewsPerPost: 120.4,
                  topPosts: []
                }
              }
            })
          );
        })
      );

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('151')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      // Should show updated data
      await waitFor(() => {
        expect(screen.getByText('152')).toBeInTheDocument();
      });

      expect(requestCount).toBe(2);
    });
  });

  describe('Error Boundary Integration', () => {
    test('should catch and handle component errors', async () => {
      // Mock a component that throws an error
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };

      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <ThrowingComponent />
        </TestWrapper>
      );

      // Should show error boundary fallback
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Authentication Integration', () => {
    test('should handle authentication state', async () => {
      // Mock authenticated user
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER'
      };

      // Set up authenticated context
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('user', JSON.stringify(mockUser));

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Should display personalized greeting
      await waitFor(() => {
        expect(screen.getByText(/good (morning|afternoon|evening), test!/i)).toBeInTheDocument();
      });
    });

    test('should handle unauthenticated state', async () => {
      // Clear authentication
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Should handle unauthenticated state appropriately
      // (Implementation specific - adjust based on your auth handling)
    });
  });

  describe('Real-time Updates Integration', () => {
    test('should handle websocket updates', async () => {
      // Mock WebSocket connection
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      // @ts-ignore
      global.WebSocket = jest.fn(() => mockWebSocket);

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Simulate real-time update
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (messageHandler) {
        messageHandler({
          data: JSON.stringify({
            type: 'STATS_UPDATE',
            data: {
              users: { total: 155, active: 125, growth: 15.2 }
            }
          })
        });
      }

      // Should update with real-time data
      await waitFor(() => {
        expect(screen.getByText('155')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    test('should render efficiently with large datasets', async () => {
      // Mock large dataset
      const largePosts = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Post ${i + 1}`,
        viewCount: 100 - i,
        commentCount: 10 - (i % 10),
        status: 'PUBLISHED'
      }));

      server.use(
        rest.get('http://localhost:3003/api/dashboard/stats', (req, res, ctx) => {
          return res(
            ctx.json({
              success: true,
              data: {
                users: { total: 150, active: 120, growth: 12.5 },
                posts: { total: 100, published: 95, drafts: 5, thisMonth: 20 },
                engagement: {
                  totalViews: 10000,
                  totalComments: 500,
                  avgViewsPerPost: 100,
                  topPosts: largePosts.slice(0, 10)
                }
              }
            })
          );
        })
      );

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      
      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });
});