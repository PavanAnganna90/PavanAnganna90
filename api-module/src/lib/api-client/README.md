# Reusable API Client Module

A production-ready, type-safe API client module with built-in retry logic, timeout handling, request/response validation, and comprehensive error handling.

## Features

- 🚀 **Fetch-based HTTP client** with clean async/await API
- 🔄 **Exponential backoff retry** with configurable max attempts
- ⏱️ **Request timeout** handling with configurable duration
- ✅ **Zod schema validation** for request/response data
- 🔧 **Request/Response interceptors** for custom logic
- 🔒 **Secure environment variable** configuration
- 📊 **Comprehensive error types** with proper error handling
- 🧪 **Full test coverage** with MSW (Mock Service Worker)
- 🎯 **TypeScript-first** with complete type safety
- 📖 **GitHub API implementation** as a real-world example

## Quick Start

### Installation

```bash
npm install zod
```

### Basic Usage

```typescript
import { ApiClient } from './lib/api-client';

// Create client
const api = new ApiClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  retries: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
});

// Make requests
const users = await api.get('/users');
const newUser = await api.post('/users', { name: 'John', email: 'john@example.com' });
```

### GitHub API Example

```typescript
import { GitHubClient } from './lib/api-client';

// Using environment variables
const github = new GitHubClient({
  accessToken: process.env.GITHUB_ACCESS_TOKEN,
});

// Get authenticated user
const user = await github.getCurrentUser();

// Search repositories
const repos = await github.searchRepositories('react', {
  sort: 'stars',
  order: 'desc',
  per_page: 10,
});

// Create an issue
const issue = await github.createIssue('owner', 'repo', {
  title: 'Bug Report',
  body: 'Description of the bug',
  labels: ['bug', 'high-priority'],
});
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# GitHub API Configuration
GITHUB_ACCESS_TOKEN=your-github-token
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_API_URL=https://api.github.com

# API Client Configuration
API_CLIENT_DEFAULT_TIMEOUT=30000
API_CLIENT_MAX_RETRIES=3
API_CLIENT_RETRY_DELAY=1000
```

### Client Configuration

```typescript
const api = new ApiClient({
  baseURL: 'https://api.example.com',
  timeout: 30000, // 30 seconds
  retries: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      return error.isRetryable() && attempt < 5;
    },
  },
  headers: {
    'User-Agent': 'MyApp/1.0',
    'X-API-Version': 'v2',
  },
  interceptors: {
    request: [
      (config) => {
        // Add auth token
        config.headers.Authorization = `Bearer ${getToken()}`;
        return config;
      },
    ],
    response: [
      async (response) => {
        // Log rate limits
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining) console.log(`Rate limit: ${remaining}`);
        return response;
      },
    ],
  },
});
```

## Schema Validation

Use Zod schemas to validate API responses:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

// Validated request
const user = await api.requestWithValidation(
  UserSchema,
  () => api.get('/users/123')
);

// TypeScript knows the exact type
console.log(user.name); // ✅ Type-safe
```

## Error Handling

The client provides comprehensive error types:

```typescript
import { ApiError, TimeoutError, ValidationError, NetworkError } from './lib/api-client';

try {
  const data = await api.get('/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.status);
    console.log('Code:', error.code);
    console.log('Data:', error.data);
    
    // Check specific error types
    if (error instanceof TimeoutError) {
      console.log('Request timed out');
    } else if (error instanceof ValidationError) {
      console.log('Response validation failed');
    } else if (error instanceof NetworkError) {
      console.log('Network connection failed');
    }
    
    // Check if error is retryable
    if (error.isRetryable()) {
      console.log('This error can be retried');
    }
  }
}
```

## Retry Logic

The client automatically retries failed requests with exponential backoff:

- **Retryable errors**: Network errors, 5xx server errors, 429 Too Many Requests, 408 Timeout
- **Non-retryable errors**: 4xx client errors (except 429)
- **Configurable**: Max attempts, delays, backoff multiplier
- **Custom logic**: Provide your own `shouldRetry` function

```typescript
const api = new ApiClient({
  baseURL: 'https://api.example.com',
  retries: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      if (error.status === 503) return true; // Always retry 503
      if (attempt > 3) return false; // Max 3 attempts
      return error.isRetryable();
    },
  },
});
```

## Interceptors

Add custom logic to requests and responses:

```typescript
// Request interceptor - Add authentication
api.addRequestInterceptor((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle rate limits
api.addResponseInterceptor(async (response) => {
  const remaining = response.headers.get('x-ratelimit-remaining');
  if (remaining && parseInt(remaining) < 10) {
    console.warn('Rate limit low:', remaining);
  }
  return response;
});
```

## Testing

The module includes comprehensive tests using MSW:

```bash
# Run all tests
npm test

# Run API client tests only
npm test -- src/lib/api-client

# Run with coverage
npm run test:coverage
```

### Test Examples

```typescript
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

test('should handle API errors', async () => {
  // Mock API error
  server.use(
    http.get('https://api.example.com/users', () => {
      return HttpResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    })
  );

  await expect(api.get('/users')).rejects.toThrow('Not found');
});
```

## GitHub Integration

The module includes a complete GitHub API client:

### OAuth Flow

```typescript
const github = new GitHubClient();

// Step 1: Get authorization URL
const authUrl = await github.getOAuthUrl(
  'http://localhost:3000/callback',
  'user:email,repo'
);

// Step 2: Exchange code for token
const tokenData = await github.exchangeCodeForToken(authorizationCode);

// Step 3: Use the token
github.setAccessToken(tokenData.access_token);
const user = await github.getCurrentUser();
```

### Repository Management

```typescript
// Get repository
const repo = await github.getRepo('owner', 'repo-name');

// Create repository
const newRepo = await github.createRepo({
  name: 'my-new-repo',
  description: 'A new repository',
  private: false,
  auto_init: true,
});

// Delete repository
await github.deleteRepo('owner', 'repo-name');
```

### Issue Management

```typescript
// List issues
const issues = await github.listIssues('owner', 'repo', {
  state: 'open',
  labels: 'bug',
  per_page: 20,
});

// Create issue
const issue = await github.createIssue('owner', 'repo', {
  title: 'Bug: Something is broken',
  body: 'Detailed description...',
  labels: ['bug', 'high-priority'],
  assignees: ['username'],
});
```

## API Reference

### ApiClient

#### Constructor Options

```typescript
interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: RetryOptions;
  headers?: Record<string, string>;
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}
```

#### Methods

- `get<T>(path: string, config?: RequestConfig): Promise<T>`
- `post<T>(path: string, data?: any, config?: RequestConfig): Promise<T>`
- `put<T>(path: string, data?: any, config?: RequestConfig): Promise<T>`
- `patch<T>(path: string, data?: any, config?: RequestConfig): Promise<T>`
- `delete<T>(path: string, config?: RequestConfig): Promise<T>`
- `requestWithValidation<T>(schema: ZodType<T>, request: () => Promise<any>): Promise<T>`

### GitHubClient

#### Methods

**Authentication:**
- `getOAuthUrl(redirectUri: string, scope?: string): Promise<string>`
- `exchangeCodeForToken(code: string): Promise<GitHubOAuthToken>`
- `setAccessToken(token: string): void`

**Users:**
- `getCurrentUser(): Promise<GitHubUser>`
- `getUser(username: string): Promise<GitHubUser>`
- `getUserRepos(username: string, options?: object): Promise<GitHubRepo[]>`

**Repositories:**
- `getRepo(owner: string, repo: string): Promise<GitHubRepo>`
- `createRepo(data: object): Promise<GitHubRepo>`
- `deleteRepo(owner: string, repo: string): Promise<void>`

**Issues:**
- `listIssues(owner: string, repo: string, options?: object): Promise<GitHubIssue[]>`
- `getIssue(owner: string, repo: string, number: number): Promise<GitHubIssue>`
- `createIssue(owner: string, repo: string, data: object): Promise<GitHubIssue>`

**Search:**
- `searchRepositories(query: string, options?: object): Promise<SearchResult>`

## Best Practices

1. **Always use environment variables** for API keys and secrets
2. **Define Zod schemas** for all API responses
3. **Handle errors properly** with specific error types
4. **Use interceptors** for cross-cutting concerns (auth, logging)
5. **Configure appropriate timeouts** based on your API
6. **Set reasonable retry limits** to avoid overwhelming servers
7. **Write tests** using MSW for reliable API mocking
8. **Use TypeScript** for better development experience

## Examples

See the [examples directory](./examples/) for more comprehensive usage examples:

- Basic API client usage
- Schema validation with Zod
- Error handling patterns
- GitHub OAuth integration
- Custom interceptors
- Batch requests
- Custom API client creation

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Ensure 100% type safety
5. Handle errors gracefully