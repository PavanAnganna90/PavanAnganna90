import request from 'supertest';
import { app } from '@/app';
import DatabaseService from '@/config/database';
import { PrismaClient } from '@prisma/client';

describe('Post Routes Integration Tests', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let adminToken: string;
  let postId: string;

  beforeAll(async () => {
    const dbService = DatabaseService.getInstance();
    await dbService.connect();
    prisma = dbService.getClient();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password123',
      });

    authToken = userResponse.body.data.token;
    userId = userResponse.body.data.user.id;

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
  });

  afterAll(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
    const dbService = DatabaseService.getInstance();
    await dbService.disconnect();
  });

  describe('POST /api/posts', () => {
    const postData = {
      title: 'Test Post',
      content: 'This is a test post content',
      published: true,
    };

    it('should create a post successfully', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Post created successfully',
        data: {
          title: postData.title,
          content: postData.content,
          published: postData.published,
          authorId: userId,
          author: {
            id: userId,
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      });

      postId = response.body.data.id;
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access token required',
      });
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Content without title',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
      });
    });
  });

  describe('GET /api/posts/published', () => {
    beforeEach(async () => {
      // Create published post
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Published Post',
          content: 'This is published',
          published: true,
        });

      // Create unpublished post
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Draft Post',
          content: 'This is a draft',
          published: false,
        });
    });

    it('should get published posts without authentication', async () => {
      const response = await request(app)
        .get('/api/posts/published')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 1, // Only published posts
          totalPages: 1,
        },
      });

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        title: 'Published Post',
        published: true,
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/posts/published?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
    });
  });

  describe('GET /api/posts/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post',
          content: 'Test content',
          published: true,
        });

      postId = response.body.data.id;
    });

    it('should get post by id without authentication', async () => {
      const response = await request(app)
        .get(`/api/posts/${postId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: postId,
          title: 'Test Post',
          content: 'Test content',
          published: true,
          author: {
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      });
    });

    it('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/non-existent-id')
        .expect(400); // Invalid CUID format

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation failed',
      });
    });
  });

  describe('GET /api/posts', () => {
    beforeEach(async () => {
      // Create multiple posts
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Published Post 1',
          content: 'Content 1',
          published: true,
        });

      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Draft Post 1',
          content: 'Content 2',
          published: false,
        });
    });

    it('should get all posts with authentication', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: 2, // All posts
          totalPages: 1,
        },
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by published status', async () => {
      const response = await request(app)
        .get('/api/posts?published=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].published).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access token required',
      });
    });
  });

  describe('PUT /api/posts/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Original Title',
          content: 'Original content',
          published: false,
        });

      postId = response.body.data.id;
    });

    it('should update post as owner', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        published: true,
      };

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Post updated successfully',
        data: {
          id: postId,
          title: updateData.title,
          content: updateData.content,
          published: updateData.published,
        },
      });
    });

    it('should update post as admin', async () => {
      const updateData = {
        title: 'Admin Updated Title',
      };

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should return 404 for non-existent post', async () => {
      // First, let's get a valid CUID that doesn't exist
      const fakeId = 'clfake123456789012345678';
      
      const response = await request(app)
        .put(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Post not found',
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .send({ title: 'Updated' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access token required',
      });
    });
  });

  describe('DELETE /api/posts/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Post to Delete',
          content: 'This will be deleted',
          published: false,
        });

      postId = response.body.data.id;
    });

    it('should delete post as owner', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Post deleted successfully',
      });

      // Verify post is deleted
      await request(app)
        .get(`/api/posts/${postId}`)
        .expect(404);
    });

    it('should delete post as admin', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Post deleted successfully',
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Access token required',
      });
    });
  });

  describe('GET /api/posts/search', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'JavaScript Tutorial',
          content: 'Learn JavaScript basics',
          published: true,
        });

      await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Python Guide',
          content: 'Advanced Python concepts',
          published: true,
        });
    });

    it('should search posts by title', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=JavaScript')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('JavaScript');
    });

    it('should search posts by content', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=Python')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toContain('Python');
    });

    it('should return empty results for no matches', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=nonexistent')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });
});