import request from 'supertest';
import { app } from '@/app';
import DatabaseService from '@/config/database';
import { PrismaClient } from '@prisma/client';

describe('User Routes Integration Tests', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let adminToken: string;

  beforeAll(async () => {
    const dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
    const dbService = DatabaseService.getInstance();
    await dbService.disconnect();
  });

  describe('POST /api/users/register', () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            email: userData.email,
            name: userData.name,
            role: 'USER',
          },
          token: expect.any(String),
        },
      });

      expect(response.body.data.user).not.toHaveProperty('password');
      authToken = response.body.data.token;
      userId = response.body.data.user.id;
    });

    it('should return 409 when email already exists', async () => {
      await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: 'User with this email already exists',
      });
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...userData,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
      });
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...userData,
          password: 'weak',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
      });
    });
  });

  describe('POST /api/users/login', () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123',
    };

    beforeEach(async () => {
      await request(app)
        .post('/api/users/register')
        .send(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: userData.email,
            name: userData.name,
            role: 'USER',
          },
          token: expect.any(String),
        },
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'wrong@example.com',
          password: userData.password,
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid credentials',
      });
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid credentials',
      });
    });
  });

  describe('GET /api/users/profile', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'Password123',
        });

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      });

      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access token required',
      });
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid or expired token',
      });
    });
  });

  describe('PUT /api/users/profile', () => {
    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'Password123',
        });

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;
    });

    it('should update profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: userId,
          email: updateData.email,
          name: updateData.name,
          role: 'USER',
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access token required',
      });
    });
  });

  describe('Admin Routes', () => {
    beforeEach(async () => {
      // Create admin user
      const adminResponse = await request(app)
        .post('/api/users/register')
        .send({
          email: 'admin@example.com',
          name: 'Admin User',
          password: 'AdminPass123',
          role: 'ADMIN',
        });

      adminToken = adminResponse.body.data.token;

      // Create regular user
      const userResponse = await request(app)
        .post('/api/users/register')
        .send({
          email: 'user@example.com',
          name: 'Regular User',
          password: 'UserPass123',
        });

      authToken = userResponse.body.data.token;
      userId = userResponse.body.data.user.id;
    });

    describe('GET /api/users', () => {
      it('should get users list as admin', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
          pagination: {
            page: 1,
            limit: 10,
            total: expect.any(Number),
            totalPages: expect.any(Number),
          },
        });

        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).not.toHaveProperty('password');
      });

      it('should return 403 for non-admin users', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Insufficient permissions',
        });
      });
    });

    describe('DELETE /api/users/:id', () => {
      it('should delete user as admin', async () => {
        const response = await request(app)
          .delete(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'User deleted successfully',
        });

        // Verify user is deleted
        const getUserResponse = await request(app)
          .get(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });

      it('should return 403 for non-admin users', async () => {
        const response = await request(app)
          .delete(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Insufficient permissions',
        });
      });
    });
  });
});