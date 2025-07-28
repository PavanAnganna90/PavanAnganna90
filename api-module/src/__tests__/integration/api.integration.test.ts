import request from 'supertest';
import { app } from '../../app';
import DatabaseService from '../../config/database';
import { getRedisClient } from '../../config/redis';

/**
 * API Integration Tests
 * Tests the complete API endpoints with database and cache interactions
 */

describe('API Integration Tests', () => {
  let dbService: DatabaseService;
  let authToken: string;
  let testUserId: string;
  let testPostId: string;

  beforeAll(async () => {
    // Initialize database connection
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    
    // Clear test data
    await clearTestData();
    
    // Create test user and get auth token
    authToken = await createTestUser();
  });

  afterAll(async () => {
    // Cleanup test data
    await clearTestData();
    
    // Close connections
    await dbService.disconnect();
    const redis = getRedisClient();
    await redis.quit();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/sso/config should return SSO configuration', async () => {
      const response = await request(app)
        .get('/api/auth/sso/config')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('ssoEnabled');
    });

    test('GET /api/auth/sso/login should initiate SSO login', async () => {
      const response = await request(app)
        .get('/api/auth/sso/login?redirect_url=/dashboard')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('ssoUrl');
    });

    test('GET /api/auth/dev-token should provide development token', async () => {
      const response = await request(app)
        .get('/api/auth/dev-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });
  });

  describe('User Management Endpoints', () => {
    test('POST /api/users should create a new user', async () => {
      const userData = {
        email: 'integration-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Integration',
        lastName: 'Test',
        role: 'USER'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(userData.email);
      
      testUserId = response.body.data.id;
    });

    test('GET /api/users should return paginated users list', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    test('GET /api/users/:id should return specific user', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(testUserId);
    });

    test('PUT /api/users/:id should update user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
    });
  });

  describe('Post Management Endpoints', () => {
    test('POST /api/posts should create a new post', async () => {
      const postData = {
        title: 'Integration Test Post',
        content: 'This is a test post for integration testing.',
        status: 'PUBLISHED'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(postData.title);
      
      testPostId = response.body.data.id;
    });

    test('GET /api/posts should return paginated posts', async () => {
      const response = await request(app)
        .get('/api/posts?page=1&limit=10&status=PUBLISHED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    test('GET /api/posts/:id should return specific post', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(testPostId);
    });

    test('PUT /api/posts/:id should update post', async () => {
      const updateData = {
        title: 'Updated Integration Test Post',
        content: 'Updated content for integration testing.'
      };

      const response = await request(app)
        .put(`/api/posts/${testPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.title).toBe(updateData.title);
    });
  });

  describe('Dashboard Endpoints', () => {
    test('GET /api/dashboard/stats should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('engagement');
    });

    test('GET /api/dashboard/activity should return activity logs', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });
  });

  describe('Health and Status Endpoints', () => {
    test('GET /api/health should return system health', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service');
    });

    test('GET /api/auth/sso-status should return SSO status', async () => {
      const response = await request(app)
        .get('/api/auth/sso-status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('ssoEnabled');
      expect(response.body.data).toHaveProperty('environment');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle invalid data validation', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '', // Empty
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUserData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to auth endpoints', async () => {
      // Make multiple rapid requests
      const requests = Array(15).fill(null).map(() =>
        request(app).get('/api/auth/sso/config')
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Caching Behavior', () => {
    test('should cache dashboard stats', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request should be faster (cached)
      const startTime = Date.now();
      const response2 = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(response1.body).toEqual(response2.body);
      expect(responseTime).toBeLessThan(100); // Should be fast from cache
    });
  });
});

/**
 * Helper function to create a test user and return auth token
 */
async function createTestUser(): Promise<string> {
  const userData = {
    email: 'admin-test@example.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'Test',
    role: 'ADMIN'
  };

  const response = await request(app)
    .post('/api/users/register')
    .send(userData);

  if (response.body.success && response.body.data.token) {
    return response.body.data.token;
  }

  // Fallback: try to get dev token
  const devResponse = await request(app)
    .get('/api/auth/dev-token');

  if (devResponse.body.success && devResponse.body.data.token) {
    return devResponse.body.data.token;
  }

  throw new Error('Failed to create test user or get auth token');
}

/**
 * Helper function to clear test data
 */
async function clearTestData(): Promise<void> {
  const prisma = dbService.getClient();
  
  try {
    // Clear test data in proper order (due to foreign key constraints)
    await prisma.post.deleteMany({
      where: {
        title: {
          contains: 'Integration Test'
        }
      }
    });
    
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'integration-test'
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'admin-test'
        }
      }
    });
    
    // Clear Redis cache
    const redis = getRedisClient();
    await redis.flushdb();
    
  } catch (error) {
    console.warn('Error clearing test data:', error);
  }
}