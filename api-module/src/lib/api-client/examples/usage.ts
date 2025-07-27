/**
 * API Client Usage Examples
 * 
 * This file demonstrates how to use the reusable API client module
 * with various configurations and real-world scenarios.
 */

import { ApiClient, GitHubClient, ApiError, createApiClient } from '../index';
import { z } from 'zod';

// Example 1: Basic API Client Usage
async function basicExample() {
  // Create a simple API client
  const api = new ApiClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    timeout: 10000,
    retries: {
      maxAttempts: 3,
      initialDelay: 1000,
    },
  });

  try {
    // Simple GET request
    const users = await api.get('/users');
    console.log('Users:', users);

    // POST request with data
    const newPost = await api.post('/posts', {
      title: 'New Post',
      body: 'This is a new post',
      userId: 1,
    });
    console.log('Created post:', newPost);

    // GET with query parameters
    const filteredPosts = await api.get('/posts', {
      params: { userId: 1 },
    });
    console.log('User posts:', filteredPosts);

  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error:', error.message, 'Status:', error.status);
    }
  }
}

// Example 2: Using Zod Validation
async function validationExample() {
  const api = new ApiClient({
    baseURL: 'https://api.example.com',
  });

  // Define schemas
  const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'user', 'guest']),
  });

  const UsersResponseSchema = z.object({
    data: z.array(UserSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  });

  try {
    // Request with validation
    const response = await api.requestWithValidation(
      UsersResponseSchema,
      () => api.get('/users', { params: { page: 1, limit: 10 } })
    );

    // TypeScript knows the exact shape of response
    console.log(`Found ${response.total} users`);
    response.data.forEach(user => {
      console.log(`${user.name} (${user.role}): ${user.email}`);
    });

  } catch (error) {
    if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
      console.error('Response validation failed:', error.data);
    }
  }
}

// Example 3: GitHub API Integration
async function githubExample() {
  // Method 1: Using environment variables
  const github = new GitHubClient();

  // Method 2: Explicit configuration
  const githubWithConfig = new GitHubClient({
    accessToken: process.env.GITHUB_TOKEN,
    timeout: 15000,
    maxRetries: 5,
  });

  try {
    // Get authenticated user
    const user = await github.getCurrentUser();
    console.log(`Logged in as: ${user.name} (@${user.login})`);

    // Search repositories
    const searchResults = await github.searchRepositories('react', {
      sort: 'stars',
      order: 'desc',
      per_page: 5,
    });
    console.log(`Found ${searchResults.total_count} React repositories`);

    // Create an issue
    const issue = await github.createIssue('myorg', 'myrepo', {
      title: 'Bug: Something is broken',
      body: '## Description\nDetailed bug description here',
      labels: ['bug', 'high-priority'],
    });
    console.log(`Created issue #${issue.number}`);

  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        console.error('Authentication failed. Check your GitHub token.');
      } else if (error.status === 404) {
        console.error('Repository not found.');
      } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
        console.error('GitHub rate limit exceeded:', error.data.resetTime);
      }
    }
  }
}

// Example 4: OAuth Flow
async function oauthExample() {
  const github = new GitHubClient();

  // Step 1: Generate OAuth URL
  const authUrl = await github.getOAuthUrl(
    'http://localhost:3000/auth/callback',
    'user:email,repo'
  );
  console.log('Redirect user to:', authUrl);

  // Step 2: After user authorizes, exchange code for token
  const code = 'received_from_callback';
  try {
    const tokenData = await github.exchangeCodeForToken(code);
    console.log('Access token received:', tokenData.access_token);

    // Step 3: Use the token
    github.setAccessToken(tokenData.access_token);
    const user = await github.getCurrentUser();
    console.log('Authenticated as:', user.email);

  } catch (error) {
    console.error('OAuth flow failed:', error);
  }
}

// Example 5: Custom Headers and Interceptors
async function interceptorExample() {
  const api = new ApiClient({
    baseURL: 'https://api.example.com',
    headers: {
      'X-API-Version': 'v2',
    },
    interceptors: {
      request: [
        // Add auth token to all requests
        (config) => {
          const token = getAuthToken(); // Your auth logic
          if (token) {
            config.headers = {
              ...config.headers,
              'Authorization': `Bearer ${token}`,
            };
          }
          return config;
        },
        // Log all requests
        (config) => {
          console.log(`[API] ${config.method} ${config.url}`);
          return config;
        },
      ],
      response: [
        // Extract and log rate limit info
        async (response) => {
          const remaining = response.headers.get('x-ratelimit-remaining');
          if (remaining) {
            console.log(`[API] Rate limit remaining: ${remaining}`);
          }
          return response;
        },
      ],
    },
  });

  await api.get('/protected-resource');
}

// Example 6: Error Handling and Retries
async function errorHandlingExample() {
  const api = new ApiClient({
    baseURL: 'https://flaky-api.example.com',
    retries: {
      maxAttempts: 5,
      initialDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 2,
      // Custom retry logic
      shouldRetry: (error, attempt) => {
        // Don't retry on 4xx errors except 429
        if (error.status && error.status >= 400 && error.status < 500) {
          return error.status === 429;
        }
        // Retry on network errors and 5xx errors
        return error.isRetryable();
      },
    },
  });

  try {
    const data = await api.get('/unreliable-endpoint');
    console.log('Success after retries:', data);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Failed after retries: ${error.message}`);
      
      // Check specific error types
      if (error.code === 'TIMEOUT') {
        console.error('Request timed out');
      } else if (error.code === 'Netwo   RK_ERROR') {
        console.error('Network connection failed');
      } else if (error.status === 500) {
        console.error('Server error');
      }
    }
  }
}

// Example 7: Batch Requests
async function batchRequestsExample() {
  const github = new GitHubClient();

  // Fetch multiple resources in parallel
  try {
    const [user, repos, issues] = await Promise.all([
      github.getCurrentUser(),
      github.getUserRepos('octocat', { per_page: 5 }),
      github.listIssues('facebook', 'react', { state: 'open', per_page: 5 }),
    ]);

    console.log(`User: ${user.name}`);
    console.log(`Repos: ${repos.length}`);
    console.log(`Open issues: ${issues.length}`);

  } catch (error) {
    console.error('Batch request failed:', error);
  }
}

// Example 8: Creating a Custom API Client
class MyCompanyApiClient {
  private api: ApiClient;

  constructor(apiKey: string) {
    this.api = new ApiClient({
      baseURL: process.env.MY_API_URL || 'https://api.mycompany.com',
      headers: {
        'X-API-Key': apiKey,
      },
      timeout: 20000,
      retries: {
        maxAttempts: 3,
      },
    });

    // Add response validation interceptor
    this.api.addResponseInterceptor(async (response) => {
      // All API responses should have this structure
      const schema = z.object({
        success: z.boolean(),
        data: z.any(),
        error: z.string().optional(),
      });

      try {
        schema.parse(response.data);
      } catch (error) {
        throw new ApiError('Invalid API response format', {
          code: 'INVALID_RESPONSE',
          data: response.data,
        });
      }

      return response;
    });
  }

  // Typed methods
  async getProducts(page = 1, limit = 20) {
    const ProductSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      inStock: z.boolean(),
    });

    const ResponseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        products: z.array(ProductSchema),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
        }),
      }),
    });

    return this.api.requestWithValidation(
      ResponseSchema,
      () => this.api.get('/products', { params: { page, limit } })
    );
  }

  async createOrder(items: Array<{ productId: string; quantity: number }>) {
    const OrderSchema = z.object({
      success: z.boolean(),
      data: z.object({
        orderId: z.string(),
        total: z.number(),
        status: z.enum(['pending', 'confirmed', 'shipped', 'delivered']),
      }),
    });

    return this.api.requestWithValidation(
      OrderSchema,
      () => this.api.post('/orders', { items })
    );
  }
}

// Utility function
function getAuthToken(): string | null {
  // Your auth token logic
  return localStorage?.getItem('auth_token') || null;
}

// Export examples for testing
export {
  basicExample,
  validationExample,
  githubExample,
  oauthExample,
  interceptorExample,
  errorHandlingExample,
  batchRequestsExample,
  MyCompanyApiClient,
};