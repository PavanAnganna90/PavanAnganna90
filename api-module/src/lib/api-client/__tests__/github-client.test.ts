import { GitHubClient } from '../implementations/github/client';
import { ApiError } from '../errors';
import { server } from './mocks/server';
import { mockUser, mockRepo, mockIssue } from './mocks/handlers';
import { http, HttpResponse } from 'msw';

describe('GitHubClient', () => {
  let client: GitHubClient;

  beforeEach(() => {
    // Mock environment variables
    process.env.GITHUB_API_URL = 'https://api.github.com';
    process.env.GITHUB_CLIENT_ID = 'test_client_id';
    process.env.GITHUB_CLIENT_SECRET = 'test_client_secret';
    
    client = new GitHubClient({
      accessToken: 'test_token',
      timeout: 5000,
      maxRetries: 2,
    });
  });

  afterEach(() => {
    delete process.env.GITHUB_API_URL;
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
  });

  describe('OAuth Methods', () => {
    it('should generate OAuth URL', async () => {
      const url = await client.getOAuthUrl('http://localhost:3000/callback', 'user:email');
      
      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('scope=user%3Aemail');
      expect(url).toContain('state=');
    });

    it('should exchange code for token', async () => {
      const token = await client.exchangeCodeForToken('test_code_123');
      
      expect(token).toEqual({
        access_token: 'mock_access_token_12345',
        token_type: 'bearer',
        scope: 'user:email,read:org',
      });
    });

    it('should throw error when OAuth credentials not configured', async () => {
      const clientWithoutCreds = new GitHubClient({});
      
      await expect(clientWithoutCreds.getOAuthUrl('http://localhost:3000/callback'))
        .rejects.toThrow('GitHub Client ID not configured');
    });
  });

  describe('User Methods', () => {
    it('should get current authenticated user', async () => {
      const user = await client.getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should get user by username', async () => {
      const user = await client.getUser('octocat');
      expect(user.login).toBe('octocat');
    });

    it('should get user repositories', async () => {
      const repos = await client.getUserRepos('testuser', {
        type: 'owner',
        sort: 'updated',
        per_page: 30,
      });
      
      expect(repos).toHaveLength(1);
      expect(repos[0]).toEqual(mockRepo);
    });

    it('should throw error when not authenticated', async () => {
      const unauthClient = new GitHubClient({});
      
      await expect(unauthClient.getCurrentUser())
        .rejects.toThrow('Authentication required');
    });
  });

  describe('Repository Methods', () => {
    it('should get repository details', async () => {
      const repo = await client.getRepo('testuser', 'test-repo');
      
      expect(repo.name).toBe('test-repo');
      expect(repo.full_name).toBe('testuser/test-repo');
    });

    it('should create a new repository', async () => {
      const newRepo = await client.createRepo({
        name: 'new-repo',
        description: 'A new test repository',
        private: false,
        auto_init: true,
      });
      
      expect(newRepo.name).toBe('new-repo');
      expect(newRepo.description).toBe('A new test repository');
    });

    it('should delete a repository', async () => {
      await expect(client.deleteRepo('testuser', 'test-repo'))
        .resolves.toBeUndefined();
    });
  });

  describe('Issue Methods', () => {
    it('should list repository issues', async () => {
      const issues = await client.listIssues('testuser', 'test-repo', {
        state: 'open',
        sort: 'created',
        per_page: 50,
      });
      
      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual(mockIssue);
    });

    it('should get single issue', async () => {
      const issue = await client.getIssue('testuser', 'test-repo', 42);
      
      expect(issue.number).toBe(42);
      expect(issue.title).toBe('Test Issue');
    });

    it('should create a new issue', async () => {
      const newIssue = await client.createIssue('testuser', 'test-repo', {
        title: 'New Bug Report',
        body: 'Description of the bug',
        labels: ['bug', 'high-priority'],
      });
      
      expect(newIssue.title).toBe('New Bug Report');
      expect(newIssue.body).toBe('Description of the bug');
    });
  });

  describe('Search Methods', () => {
    it('should search repositories', async () => {
      const results = await client.searchRepositories('typescript', {
        sort: 'stars',
        order: 'desc',
        per_page: 10,
      });
      
      expect(results.total_count).toBe(1);
      expect(results.items).toHaveLength(1);
      expect(results.items[0].name).toBe('search-result-typescript');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      server.use(
        http.get('https://api.github.com/user', () => {
          return HttpResponse.json(
            { message: 'Bad credentials' },
            { status: 401 }
          );
        })
      );

      await expect(client.getCurrentUser()).rejects.toThrow('Bad credentials');
    });

    it('should handle rate limit errors', async () => {
      server.use(
        http.get('https://api.github.com/user', () => {
          return new HttpResponse(
            JSON.stringify({ message: 'API rate limit exceeded' }),
            {
              status: 429,
              headers: {
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
              },
            }
          );
        })
      );

      await expect(client.getCurrentUser()).rejects.toThrow(/rate limit exceeded/i);
    });

    it('should retry on server errors', async () => {
      let attempts = 0;
      
      server.use(
        http.get('https://api.github.com/repos/testuser/test-repo', () => {
          attempts++;
          if (attempts < 2) {
            return HttpResponse.json(
              { message: 'Internal Server Error' },
              { status: 500 }
            );
          }
          return HttpResponse.json(mockRepo);
        })
      );

      const repo = await client.getRepo('testuser', 'test-repo');
      expect(repo).toEqual(mockRepo);
      expect(attempts).toBe(2);
    });
  });

  describe('Token Management', () => {
    it('should update access token', async () => {
      const newToken = 'new_test_token';
      client.setAccessToken(newToken);
      
      server.use(
        http.get('https://api.github.com/user', ({ request }) => {
          const auth = request.headers.get('authorization');
          return HttpResponse.json({ auth });
        })
      );

      const result = await client.getCurrentUser();
      expect(result.auth).toBe(`Bearer ${newToken}`);
    });
  });
});