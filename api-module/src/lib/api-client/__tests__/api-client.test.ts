import { ApiClient } from '../client';
import { ApiError, TimeoutError, ValidationError } from '../errors';
import { z } from 'zod';
import { server } from './mocks/server';
import { errorHandlers } from './mocks/handlers';
import { http, HttpResponse } from 'msw';

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient({
      baseURL: 'https://api.example.com',
      timeout: 5000,
      retries: {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      },
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET requests', async () => {
      server.use(
        http.get('https://api.example.com/users/123', () => {
          return HttpResponse.json({ id: 123, name: 'John Doe' });
        })
      );

      const result = await client.get('/users/123');
      expect(result).toEqual({ id: 123, name: 'John Doe' });
    });

    it('should make POST requests with data', async () => {
      server.use(
        http.post('https://api.example.com/users', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ id: 123, ...body });
        })
      );

      const result = await client.post('/users', { name: 'John Doe', email: 'john@example.com' });
      expect(result).toEqual({ id: 123, name: 'John Doe', email: 'john@example.com' });
    });

    it('should make PUT requests', async () => {
      server.use(
        http.put('https://api.example.com/users/123', async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({ id: 123, ...body, updated: true });
        })
      );

      const result = await client.put('/users/123', { name: 'John Updated' });
      expect(result).toEqual({ id: 123, name: 'John Updated', updated: true });
    });

    it('should make DELETE requests', async () => {
      server.use(
        http.delete('https://api.example.com/users/123', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await client.delete('/users/123');
      expect(result).toEqual({ success: true });
    });
  });

  describe('Query Parameters', () => {
    it('should append query parameters to URL', async () => {
      server.use(
        http.get('https://api.example.com/users', ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const limit = url.searchParams.get('limit');
          const tags = url.searchParams.getAll('tags');
          
          return HttpResponse.json({ 
            page: Number(page), 
            limit: Number(limit),
            tags 
          });
        })
      );

      const result = await client.get('/users', {
        params: { page: 2, limit: 20, tags: ['admin', 'active'] },
      });
      
      expect(result).toEqual({ page: 2, limit: 20, tags: ['admin', 'active'] });
    });
  });

  describe('Headers', () => {
    it('should include default headers', async () => {
      server.use(
        http.get('https://api.example.com/test', ({ request }) => {
          const contentType = request.headers.get('content-type');
          return HttpResponse.json({ contentType });
        })
      );

      const result = await client.get('/test');
      expect(result).toEqual({ contentType: 'application/json' });
    });

    it('should allow custom headers', async () => {
      server.use(
        http.get('https://api.example.com/test', ({ request }) => {
          const auth = request.headers.get('authorization');
          return HttpResponse.json({ auth });
        })
      );

      const result = await client.get('/test', {
        headers: { 'Authorization': 'Bearer token123' },
      });
      
      expect(result).toEqual({ auth: 'Bearer token123' });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      server.use(
        http.get('https://api.example.com/not-found', () => {
          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      await expect(client.get('/not-found')).rejects.toThrow(ApiError);
      
      try {
        await client.get('/not-found');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
        expect((error as ApiError).message).toBe('Not found');
      }
    });

    it('should handle network errors', async () => {
      server.use(
        http.get('https://api.example.com/network-error', () => {
          return HttpResponse.error();
        })
      );

      await expect(client.get('/network-error')).rejects.toThrow(Error);
    });

    it('should handle timeout errors', async () => {
      const fastClient = new ApiClient({
        baseURL: 'https://api.example.com',
        timeout: 100, // 100ms timeout
      });

      server.use(
        http.get('https://api.example.com/slow', async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return HttpResponse.json({ data: 'too late' });
        })
      );

      await expect(fastClient.get('/slow')).rejects.toThrow(TimeoutError);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 5xx errors', async () => {
      let attempts = 0;
      
      server.use(
        http.get('https://api.example.com/flaky', () => {
          attempts++;
          if (attempts < 3) {
            return HttpResponse.json({ error: 'Server error' }, { status: 500 });
          }
          return HttpResponse.json({ success: true });
        })
      );

      const result = await client.get('/flaky');
      expect(result).toEqual({ success: true });
      expect(attempts).toBe(3);
    });

    it('should not retry on 4xx errors', async () => {
      let attempts = 0;
      
      server.use(
        http.get('https://api.example.com/bad-request', () => {
          attempts++;
          return HttpResponse.json({ error: 'Bad request' }, { status: 400 });
        })
      );

      await expect(client.get('/bad-request')).rejects.toThrow(ApiError);
      expect(attempts).toBe(1);
    });

    it('should respect max retry attempts', async () => {
      let attempts = 0;
      
      server.use(
        http.get('https://api.example.com/always-fails', () => {
          attempts++;
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      await expect(client.get('/always-fails')).rejects.toThrow(ApiError);
      expect(attempts).toBe(3); // Default max attempts
    });
  });

  describe('Response Validation', () => {
    it('should validate response with Zod schema', async () => {
      const UserSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      server.use(
        http.get('https://api.example.com/user', () => {
          return HttpResponse.json({ id: 1, name: 'John', email: 'john@example.com' });
        })
      );

      const result = await client.requestWithValidation(
        UserSchema,
        () => client.get('/user')
      );

      expect(result).toEqual({ id: 1, name: 'John', email: 'john@example.com' });
    });

    it('should throw ValidationError on invalid response', async () => {
      const UserSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      server.use(
        http.get('https://api.example.com/user', () => {
          return HttpResponse.json({ id: '1', name: 'John', email: 'invalid-email' });
        })
      );

      await expect(
        client.requestWithValidation(UserSchema, () => client.get('/user'))
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptedClient = new ApiClient({
        baseURL: 'https://api.example.com',
        interceptors: {
          request: [
            (config) => {
              config.headers = {
                ...config.headers,
                'X-Custom-Header': 'intercepted',
              };
              return config;
            },
          ],
        },
      });

      server.use(
        http.get('https://api.example.com/test', ({ request }) => {
          const customHeader = request.headers.get('x-custom-header');
          return HttpResponse.json({ customHeader });
        })
      );

      const result = await interceptedClient.get('/test');
      expect(result).toEqual({ customHeader: 'intercepted' });
    });

    it('should apply response interceptors', async () => {
      const interceptedClient = new ApiClient({
        baseURL: 'https://api.example.com',
        interceptors: {
          response: [
            async (response) => {
              response.data = { ...response.data, intercepted: true };
              return response;
            },
          ],
        },
      });

      server.use(
        http.get('https://api.example.com/test', () => {
          return HttpResponse.json({ original: true });
        })
      );

      const result = await interceptedClient.get('/test');
      expect(result).toEqual({ original: true, intercepted: true });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response bodies', async () => {
      server.use(
        http.delete('https://api.example.com/resource', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const result = await client.delete('/resource');
      expect(result).toBeNull();
    });

    it('should handle non-JSON responses', async () => {
      server.use(
        http.get('https://api.example.com/text', () => {
          return new HttpResponse('Plain text response', {
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      );

      const result = await client.get('/text');
      expect(result).toBe('Plain text response');
    });

    it('should handle malformed JSON', async () => {
      server.use(
        http.get('https://api.example.com/bad-json', () => {
          return new HttpResponse('{ invalid json }', {
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      await expect(client.get('/bad-json')).rejects.toThrow(ValidationError);
    });
  });
});