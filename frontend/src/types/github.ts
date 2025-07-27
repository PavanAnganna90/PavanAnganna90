/**
 * GitHub Integration Types
 * TypeScript type definitions for GitHub features
 */

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

export interface GitHubActivity {
  repositoriesCount: number;
  recentRepositories: GitHubRepository[];
  languages: string[];
  totalStars: number;
  totalForks: number;
}

export interface GitHubSyncResult {
  success: boolean;
  updated: boolean;
  changes: string[];
  error?: string;
}

export interface GitHubValidation {
  isValid: boolean;
  error?: string;
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

export interface GitHubSearchResult {
  total_count: number;
  items: GitHubRepository[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
  };
}

// Webhook types
export interface WebhookConfig {
  url: string;
  events: string[];
  active: boolean;
  content_type: string;
  insecure_ssl: string;
}

export interface WebhookStats {
  totalEvents: number;
  eventTypes: Record<string, number>;
  lastProcessed?: Date;
}

export interface WebhookValidation {
  endpointUrl: string;
  isAccessible: boolean;
  supportedEvents: string[];
  securityNotes: string[];
}

// Dashboard types
export interface DashboardStats {
  totalUsers: number;
  connectedGitHubUsers: number;
  totalRepositories: number;
  totalStars: number;
  totalForks: number;
  topLanguages: Array<{ language: string; count: number }>;
  recentActivity: Array<{
    type: 'user_joined' | 'repo_created' | 'github_connected';
    user: string;
    timestamp: Date;
    details?: string;
  }>;
}

export interface UserDashboard {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    githubConnected: boolean;
  };
  github?: {
    profile: GitHubUser;
    repositories: GitHubRepository[];
    stats: {
      totalRepos: number;
      totalStars: number;
      totalForks: number;
      languages: string[];
    };
    activity: GitHubActivity;
  };
  summary: {
    joinedAt: Date;
    lastActive: Date;
    repositoriesCount: number;
    contributionsThisMonth: number;
  };
}

export interface RepositoryInsights {
  totalRepositories: number;
  languages: string[];
  mostStarred: GitHubRepository[];
  recentlyUpdated: GitHubRepository[];
  totalStars: number;
  totalForks: number;
  languageStats: Record<string, number>;
}

export interface ActivityTimelineItem {
  type: string;
  timestamp: Date;
  title: string;
  description: string;
  metadata?: any;
}

export interface ActivityTimeline {
  timeline: ActivityTimelineItem[];
  total: number;
}