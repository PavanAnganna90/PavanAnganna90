/**
 * GitHub API Client for Frontend
 * Provides typed interface to communicate with our GitHub backend API endpoints
 */

import { ApiResponse } from '@/types/api';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  size: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
}

export interface GitHubProfile {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    githubId?: string;
    githubLogin?: string;
    avatar?: string;
    company?: string;
    location?: string;
    bio?: string;
    publicRepos?: number;
    followers?: number;
    following?: number;
  };
  githubProfile: GitHubUser;
  repositories: GitHubRepository[];
  stats: {
    totalRepos: number;
    totalStars: number;
    totalForks: number;
    languages: string[];
  };
}

export interface GitHubSyncResult {
  success: boolean;
  updated: boolean;
  changes: string[];
  error?: string;
}

export interface GitHubActivity {
  repositoriesCount: number;
  recentRepositories: GitHubRepository[];
  languages: string[];
  totalStars: number;
  totalForks: number;
}

export interface GitHubSearchResult {
  total_count: number;
  items: GitHubRepository[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface CreateRepositoryData {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
  gitignore_template?: string;
  license_template?: string;
}

export interface RepositoryListOptions {
  type?: 'all' | 'owner' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  per_page?: number;
  page?: number;
}

export interface SearchRepositoryOptions {
  sort?: 'stars' | 'forks' | 'updated';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface GitHubValidation {
  isValid: boolean;
  error?: string;
}

class GitHubApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3003/api') {
    this.baseUrl = baseUrl;
    // Try to get auth token from localStorage
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth_token');
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<T> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }

      return data.data;
    } catch (error) {
      console.error(`GitHub API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get user's GitHub profile with repositories and stats
   */
  async getProfile(): Promise<GitHubProfile> {
    return this.makeRequest<GitHubProfile>('/github/profile');
  }

  /**
   * Sync user data with latest GitHub information
   */
  async syncProfile(): Promise<GitHubSyncResult> {
    return this.makeRequest<GitHubSyncResult>('/github/sync', {
      method: 'POST',
    });
  }

  /**
   * Get user's repositories
   */
  async getRepositories(options: RepositoryListOptions = {}): Promise<{
    repositories: GitHubRepository[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.sort) params.append('sort', options.sort);
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    const queryString = params.toString();
    const endpoint = `/github/repositories${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  /**
   * Get specific repository details
   */
  async getRepository(repoName: string): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>(`/github/repositories/${encodeURIComponent(repoName)}`);
  }

  /**
   * Create a new repository
   */
  async createRepository(data: CreateRepositoryData): Promise<GitHubRepository> {
    return this.makeRequest<GitHubRepository>('/github/repositories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Search GitHub repositories
   */
  async searchRepositories(
    query: string,
    options: SearchRepositoryOptions = {}
  ): Promise<GitHubSearchResult> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options.sort) params.append('sort', options.sort);
    if (options.order) params.append('order', options.order);
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    return this.makeRequest(`/github/search/repositories?${params.toString()}`);
  }

  /**
   * Get user's GitHub activity summary
   */
  async getActivity(): Promise<GitHubActivity> {
    return this.makeRequest<GitHubActivity>('/github/activity');
  }

  /**
   * Disconnect GitHub account
   */
  async disconnectGitHub(): Promise<{ message: string }> {
    return this.makeRequest('/github/disconnect', {
      method: 'DELETE',
    });
  }

  /**
   * Validate GitHub connection
   */
  async validateConnection(): Promise<GitHubValidation> {
    return this.makeRequest<GitHubValidation>('/github/validate');
  }
}

// Create and export singleton instance
export const githubApiClient = new GitHubApiClient();

// Export class for custom instances
export { GitHubApiClient };