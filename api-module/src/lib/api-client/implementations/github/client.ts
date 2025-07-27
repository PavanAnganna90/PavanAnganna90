import { ApiClient } from '../../client';
import { ApiError } from '../../errors';
import {
  GitHubUserSchema,
  GitHubRepoSchema,
  GitHubIssueSchema,
  GitHubPullRequestSchema,
  GitHubOAuthTokenSchema,
  GitHubUser,
  GitHubRepo,
  GitHubIssue,
  GitHubPullRequest,
  GitHubOAuthToken,
} from './schemas';
import { z } from 'zod';

export interface GitHubClientConfig {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  timeout?: number;
  maxRetries?: number;
}

export class GitHubClient {
  private api: ApiClient;
  private accessToken?: string;
  private clientId?: string;
  private clientSecret?: string;

  constructor(config: GitHubClientConfig = {}) {
    // Read from environment variables if not provided
    this.accessToken = config.accessToken || process.env.GITHUB_ACCESS_TOKEN;
    this.clientId = config.clientId || process.env.GITHUB_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.GITHUB_CLIENT_SECRET;

    // Initialize API client
    this.api = new ApiClient({
      baseURL: process.env.GITHUB_API_URL || 'https://api.github.com',
      timeout: config.timeout || 30000,
      retries: {
        maxAttempts: config.maxRetries || 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'OpsSight-API-Client',
        ...(this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {}),
      },
    });

    // Add response interceptor for rate limit handling
    this.api.addResponseInterceptor(async (response) => {
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      
      if (remaining && parseInt(remaining) === 0 && reset) {
        const resetTime = new Date(parseInt(reset) * 1000);
        throw new ApiError(`GitHub API rate limit exceeded. Resets at ${resetTime.toISOString()}`, {
          status: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          data: { resetTime },
        });
      }
      
      return response;
    });
  }

  // OAuth Methods
  async getOAuthUrl(redirectUri: string, scope: string = 'user:email,read:org'): Promise<string> {
    if (!this.clientId) {
      throw new ApiError('GitHub Client ID not configured', { code: 'CONFIG_ERROR' });
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope,
      state: this.generateState(),
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<GitHubOAuthToken> {
    if (!this.clientId || !this.clientSecret) {
      throw new ApiError('GitHub OAuth credentials not configured', { code: 'CONFIG_ERROR' });
    }

    return this.api.requestWithValidation(
      GitHubOAuthTokenSchema,
      () => this.api.post('https://github.com/login/oauth/access_token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      }, {
        headers: {
          'Accept': 'application/json',
        },
      })
    );
  }

  // User Methods
  async getCurrentUser(): Promise<GitHubUser> {
    this.requireAuth();
    return this.api.requestWithValidation(
      GitHubUserSchema,
      () => this.api.get('/user')
    );
  }

  async getUser(username: string): Promise<GitHubUser> {
    return this.api.requestWithValidation(
      GitHubUserSchema,
      () => this.api.get(`/users/${username}`)
    );
  }

  async getUserRepos(username: string, options?: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
    page?: number;
  }): Promise<GitHubRepo[]> {
    return this.api.requestWithValidation(
      z.array(GitHubRepoSchema),
      () => this.api.get(`/users/${username}/repos`, { params: options })
    );
  }

  // Repository Methods
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return this.api.requestWithValidation(
      GitHubRepoSchema,
      () => this.api.get(`/repos/${owner}/${repo}`)
    );
  }

  async createRepo(data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }): Promise<GitHubRepo> {
    this.requireAuth();
    return this.api.requestWithValidation(
      GitHubRepoSchema,
      () => this.api.post('/user/repos', data)
    );
  }

  async deleteRepo(owner: string, repo: string): Promise<void> {
    this.requireAuth();
    await this.api.delete(`/repos/${owner}/${repo}`);
  }

  // Issue Methods
  async listIssues(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<GitHubIssue[]> {
    return this.api.requestWithValidation(
      z.array(GitHubIssueSchema),
      () => this.api.get(`/repos/${owner}/${repo}/issues`, { params: options })
    );
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.api.requestWithValidation(
      GitHubIssueSchema,
      () => this.api.get(`/repos/${owner}/${repo}/issues/${issueNumber}`)
    );
  }

  async createIssue(owner: string, repo: string, data: {
    title: string;
    body?: string;
    assignees?: string[];
    milestone?: number;
    labels?: string[];
  }): Promise<GitHubIssue> {
    this.requireAuth();
    return this.api.requestWithValidation(
      GitHubIssueSchema,
      () => this.api.post(`/repos/${owner}/${repo}/issues`, data)
    );
  }

  // Pull Request Methods
  async listPullRequests(owner: string, repo: string, options?: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<GitHubPullRequest[]> {
    return this.api.requestWithValidation(
      z.array(GitHubPullRequestSchema),
      () => this.api.get(`/repos/${owner}/${repo}/pulls`, { params: options })
    );
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<GitHubPullRequest> {
    return this.api.requestWithValidation(
      GitHubPullRequestSchema,
      () => this.api.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`)
    );
  }

  // Search Methods
  async searchRepositories(query: string, options?: {
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }): Promise<{ total_count: number; items: GitHubRepo[] }> {
    const schema = z.object({
      total_count: z.number(),
      items: z.array(GitHubRepoSchema),
    });

    return this.api.requestWithValidation(
      schema,
      () => this.api.get('/search/repositories', { 
        params: { q: query, ...options } 
      })
    );
  }

  // Utility Methods
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.api.setDefaultHeader('Authorization', `Bearer ${token}`);
  }

  private requireAuth(): void {
    if (!this.accessToken) {
      throw new ApiError('Authentication required. Please provide an access token.', {
        code: 'AUTH_REQUIRED',
      });
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}