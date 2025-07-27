import { http, HttpResponse } from 'msw';

const GITHUB_API_URL = 'https://api.github.com';

// Mock data
export const mockUser = {
  id: 12345,
  login: 'testuser',
  avatar_url: 'https://avatars.githubusercontent.com/u/12345',
  html_url: 'https://github.com/testuser',
  name: 'Test User',
  email: 'test@example.com',
  bio: 'Test bio',
  company: 'Test Company',
  location: 'Test Location',
  blog: 'https://testblog.com',
  public_repos: 42,
  public_gists: 5,
  followers: 100,
  following: 50,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

export const mockRepo = {
  id: 123456,
  name: 'test-repo',
  full_name: 'testuser/test-repo',
  private: false,
  owner: {
    login: 'testuser',
    id: 12345,
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
  },
  html_url: 'https://github.com/testuser/test-repo',
  description: 'A test repository',
  fork: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-06-01T00:00:00Z',
  pushed_at: '2023-06-01T00:00:00Z',
  git_url: 'git://github.com/testuser/test-repo.git',
  ssh_url: 'git@github.com:testuser/test-repo.git',
  clone_url: 'https://github.com/testuser/test-repo.git',
  size: 1024,
  stargazers_count: 42,
  watchers_count: 42,
  language: 'TypeScript',
  forks_count: 10,
  open_issues_count: 3,
  default_branch: 'main',
};

export const mockIssue = {
  id: 1,
  number: 1,
  title: 'Test Issue',
  user: {
    login: 'testuser',
    id: 12345,
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
  },
  state: 'open' as const,
  locked: false,
  assignee: null,
  assignees: [],
  labels: [
    {
      id: 1,
      name: 'bug',
      color: 'd73a4a',
      description: 'Something isn\'t working',
    },
  ],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  closed_at: null,
  body: 'This is a test issue',
  comments: 0,
};

// Default handlers
export const handlers = [
  // User endpoints
  http.get(`${GITHUB_API_URL}/user`, ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Requires authentication' },
        { status: 401 }
      );
    }
    return HttpResponse.json(mockUser);
  }),

  http.get(`${GITHUB_API_URL}/users/:username`, ({ params }) => {
    return HttpResponse.json({
      ...mockUser,
      login: params.username as string,
    });
  }),

  // Repository endpoints
  http.get(`${GITHUB_API_URL}/users/:username/repos`, () => {
    return HttpResponse.json([mockRepo]);
  }),

  http.get(`${GITHUB_API_URL}/repos/:owner/:repo`, ({ params }) => {
    return HttpResponse.json({
      ...mockRepo,
      name: params.repo as string,
      full_name: `${params.owner}/${params.repo}`,
    });
  }),

  http.post(`${GITHUB_API_URL}/user/repos`, async ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Requires authentication' },
        { status: 401 }
      );
    }

    const body = await request.json();
    return HttpResponse.json({
      ...mockRepo,
      ...(typeof body === 'object' && body !== null ? body : {}),
      id: Math.floor(Math.random() * 1000000),
    });
  }),

  http.delete(`${GITHUB_API_URL}/repos/:owner/:repo`, ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Requires authentication' },
        { status: 401 }
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Issue endpoints
  http.get(`${GITHUB_API_URL}/repos/:owner/:repo/issues`, () => {
    return HttpResponse.json([mockIssue]);
  }),

  http.get(`${GITHUB_API_URL}/repos/:owner/:repo/issues/:number`, ({ params }) => {
    return HttpResponse.json({
      ...mockIssue,
      number: parseInt(params.number as string),
    });
  }),

  http.post(`${GITHUB_API_URL}/repos/:owner/:repo/issues`, async ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Requires authentication' },
        { status: 401 }
      );
    }

    const body = await request.json();
    return HttpResponse.json({
      ...mockIssue,
      ...(typeof body === 'object' && body !== null ? body : {}),
      id: Math.floor(Math.random() * 10000),
      number: Math.floor(Math.random() * 1000),
    });
  }),

  // Search endpoint
  http.get(`${GITHUB_API_URL}/search/repositories`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    return HttpResponse.json({
      total_count: 1,
      items: [{
        ...mockRepo,
        name: `search-result-${query}`,
      }],
    });
  }),

  // OAuth endpoints
  http.post('https://github.com/login/oauth/access_token', async ({ request }) => {
    const body = await request.json() as any;
    
    if (!body || typeof body !== 'object' || !body.client_id || !body.client_secret || !body.code) {
      return HttpResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      access_token: 'mock_access_token_12345',
      token_type: 'bearer',
      scope: 'user:email,read:org',
    });
  }),
];

// Error simulation handlers
export const errorHandlers = {
  networkError: http.get(`${GITHUB_API_URL}/*`, () => {
    return HttpResponse.error();
  }),

  timeout: http.get(`${GITHUB_API_URL}/*`, async () => {
    await new Promise(resolve => setTimeout(resolve, 60000));
    return HttpResponse.json({});
  }),

  serverError: http.get(`${GITHUB_API_URL}/*`, () => {
    return HttpResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  rateLimitExceeded: http.get(`${GITHUB_API_URL}/*`, () => {
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
  }),

  unauthorized: http.get(`${GITHUB_API_URL}/*`, () => {
    return HttpResponse.json(
      { message: 'Bad credentials' },
      { status: 401 }
    );
  }),

  notFound: http.get(`${GITHUB_API_URL}/*`, () => {
    return HttpResponse.json(
      { message: 'Not Found' },
      { status: 404 }
    );
  }),
};