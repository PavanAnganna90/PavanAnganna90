import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { UserManagement } from '@/components/dashboard/UserManagement';
import { PostManagement } from '@/components/dashboard/PostManagement';
import { AuthProvider } from '@/contexts/DashboardAuthContext';
import { ToastProvider } from '@/contexts/ToastContext';

/**
 * Component Integration Tests
 * Tests the integration between multiple components and their interactions
 */

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  api: {
    dashboard: {
      getStats: jest.fn(() => Promise.resolve({
        data: {
          users: { total: 150, active: 120, growth: 12.5 },
          posts: { total: 45, published: 40, drafts: 5, thisMonth: 8 },
          engagement: {
            totalViews: 5420,
            totalComments: 234,
            avgViewsPerPost: 120.4,
            topPosts: []
          }
        }
      })),
      getActivityLogs: jest.fn(() => Promise.resolve({
        data: {
          data: [
            {
              id: '1',
              action: 'CREATE',
              resource: 'POST',
              user: { firstName: 'John', lastName: 'Doe' },
              createdAt: new Date().toISOString()
            }
          ],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      })),
    },
    users: {
      getAll: jest.fn(() => Promise.resolve({
        data: {
          data: [
            {
              id: '1',
              email: 'john@example.com',
              firstName: 'John',
              lastName: 'Doe',
              role: 'USER',
              createdAt: new Date().toISOString()
            }
          ],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      })),
      create: jest.fn(() => Promise.resolve({
        data: {
          id: '2',
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          role: 'USER'
        }
      })),
      update: jest.fn(() => Promise.resolve({
        data: {
          id: '1',
          email: 'updated@example.com',
          firstName: 'Updated',
          lastName: 'User',
          role: 'USER'
        }
      })),
      delete: jest.fn(() => Promise.resolve({ data: null })),
    },
    posts: {
      getAll: jest.fn(() => Promise.resolve({
        data: {
          data: [
            {
              id: '1',
              title: 'Test Post',
              content: 'Test content',
              status: 'PUBLISHED',
              authorId: '1',
              viewCount: 100,
              createdAt: new Date().toISOString()
            }
          ],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      })),
      create: jest.fn(() => Promise.resolve({
        data: {
          id: '2',
          title: 'New Post',
          content: 'New content',
          status: 'DRAFT',
          authorId: '1'
        }
      })),
      update: jest.fn(() => Promise.resolve({
        data: {
          id: '1',
          title: 'Updated Post',
          content: 'Updated content',
          status: 'PUBLISHED',
          authorId: '1'
        }
      })),
      delete: jest.fn(() => Promise.resolve({ data: null })),
    },
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Component Integration Tests', () => {
  beforeEach(() => {
    // Set up authenticated user
    localStorage.setItem('auth_token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'ADMIN'
    }));
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Dashboard Layout Integration', () => {
    test('should render dashboard layout with navigation and content', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <DashboardOverview />
          </DashboardLayout>
        </TestWrapper>
      );

      // Should render navigation
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Should render main content area
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Should render dashboard overview
      await waitFor(() => {
        expect(screen.getByText(/good (morning|afternoon|evening)/i)).toBeInTheDocument();
      });
    });

    test('should navigate between different dashboard sections', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DashboardLayout>
            <DashboardOverview />
          </DashboardLayout>
        </TestWrapper>
      );

      // Should have navigation links
      const usersLink = screen.getByRole('link', { name: /users/i });
      const postsLink = screen.getByRole('link', { name: /posts/i });

      expect(usersLink).toBeInTheDocument();
      expect(postsLink).toBeInTheDocument();

      // Should be able to click navigation links
      await user.click(usersLink);
      expect(usersLink).toHaveAttribute('href', '/dashboard/users');

      await user.click(postsLink);
      expect(postsLink).toHaveAttribute('href', '/dashboard/posts');
    });

    test('should display user information in header', async () => {
      render(
        <TestWrapper>
          <DashboardLayout>
            <DashboardOverview />
          </DashboardLayout>
        </TestWrapper>
      );

      // Should display user name
      expect(screen.getByText('Test User')).toBeInTheDocument();

      // Should have user menu/avatar
      const userMenu = screen.getByRole('button', { name: /user menu/i });
      expect(userMenu).toBeInTheDocument();
    });
  });

  describe('Dashboard Overview Integration', () => {
    test('should load and display all dashboard components', async () => {
      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Should display stats cards
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total users
        expect(screen.getByText('45')).toBeInTheDocument(); // Total posts
      });

      // Should display activity section
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();

      // Should display quick actions
      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    });

    test('should handle refresh functionality', async () => {
      const user = userEvent.setup();
      const { api } = require('@/lib/api-client');

      render(
        <TestWrapper>
          <DashboardOverview />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Should call API again
      expect(api.dashboard.getStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('User Management Integration', () => {
    test('should load and display users list', async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Should display users table
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Should have action buttons
      expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
    });

    test('should handle user creation workflow', async () => {
      const user = userEvent.setup();
      const { api } = require('@/lib/api-client');

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Click add user button
      const addButton = screen.getByRole('button', { name: /add user/i });
      await user.click(addButton);

      // Should open create user modal/form
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Fill out form
      const emailInput = screen.getByLabelText(/email/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);

      await user.type(emailInput, 'new@example.com');
      await user.type(firstNameInput, 'New');
      await user.type(lastNameInput, 'User');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Should call API
      expect(api.users.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        password: expect.any(String),
        role: 'USER'
      });
    });

    test('should handle user editing workflow', async () => {
      const user = userEvent.setup();
      const { api } = require('@/lib/api-client');

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should open edit form
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Update fields
      const emailInput = screen.getByDisplayValue('john@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update/i });
      await user.click(submitButton);

      // Should call API
      expect(api.users.update).toHaveBeenCalledWith('1', {
        email: 'updated@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER'
      });
    });
  });

  describe('Post Management Integration', () => {
    test('should load and display posts list', async () => {
      render(
        <TestWrapper>
          <PostManagement />
        </TestWrapper>
      );

      // Should display posts table
      await waitFor(() => {
        expect(screen.getByText('Test Post')).toBeInTheDocument();
        expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
      });

      // Should have action buttons
      expect(screen.getByRole('button', { name: /add post/i })).toBeInTheDocument();
    });

    test('should handle post creation workflow', async () => {
      const user = userEvent.setup();
      const { api } = require('@/lib/api-client');

      render(
        <TestWrapper>
          <PostManagement />
        </TestWrapper>
      );

      // Click add post button
      const addButton = screen.getByRole('button', { name: /add post/i });
      await user.click(addButton);

      // Should open create post form
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Fill out form
      const titleInput = screen.getByLabelText(/title/i);
      const contentInput = screen.getByLabelText(/content/i);

      await user.type(titleInput, 'New Post');
      await user.type(contentInput, 'New post content');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Should call API
      expect(api.posts.create).toHaveBeenCalledWith({
        title: 'New Post',
        content: 'New post content',
        status: 'DRAFT'
      });
    });
  });

  describe('Toast Notifications Integration', () => {
    test('should display success notifications', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Trigger successful action
      const addButton = screen.getByRole('button', { name: /add user/i });
      await user.click(addButton);

      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/last name/i), 'User');
      
      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Should display success toast
      await waitFor(() => {
        expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
      });
    });

    test('should display error notifications', async () => {
      const user = userEvent.setup();
      const { api } = require('@/lib/api-client');

      // Mock API error
      api.users.create.mockRejectedValueOnce(new Error('Failed to create user'));

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Trigger failed action
      const addButton = screen.getByRole('button', { name: /add user/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      // Should display error toast
      await waitFor(() => {
        expect(screen.getByText(/failed to create user/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering Integration', () => {
    test('should filter users based on search input', async () => {
      const user = userEvent.setup();
      const { api } = require('@/lib/api-client');

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Use search input
      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'john');

      // Should call API with search parameter
      await waitFor(() => {
        expect(api.users.getAll).toHaveBeenCalledWith({
          search: 'john',
          page: 1,
          limit: 10
        });
      });
    });
  });

  describe('Pagination Integration', () => {
    test('should handle pagination correctly', async () => {
      const user = userEvent.setup();
      const { api } = require('@/lib/api-client');

      // Mock paginated response
      api.users.getAll.mockResolvedValueOnce({
        data: {
          data: [],
          pagination: { total: 25, page: 1, limit: 10, totalPages: 3 }
        }
      });

      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );

      // Wait for pagination to appear
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });

      // Click next page
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should call API with next page
      expect(api.users.getAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10
      });
    });
  });
});