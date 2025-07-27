import { z } from 'zod';

// GitHub User Schema
export const GitHubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  bio: z.string().nullable(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  blog: z.string().nullable(),
  public_repos: z.number(),
  public_gists: z.number(),
  followers: z.number(),
  following: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

// GitHub Repository Schema
export const GitHubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  owner: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string().url(),
  }),
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string().nullable(),
  git_url: z.string(),
  ssh_url: z.string(),
  clone_url: z.string().url(),
  size: z.number(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  language: z.string().nullable(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  default_branch: z.string(),
});

// GitHub Issue Schema
export const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  user: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string().url(),
  }),
  state: z.enum(['open', 'closed']),
  locked: z.boolean(),
  assignee: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string().url(),
  }).nullable(),
  assignees: z.array(z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string().url(),
  })),
  labels: z.array(z.object({
    id: z.number(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable(),
  })),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  body: z.string().nullable(),
  comments: z.number(),
});

// GitHub Pull Request Schema
export const GitHubPullRequestSchema = GitHubIssueSchema.extend({
  html_url: z.string().url(),
  diff_url: z.string().url(),
  patch_url: z.string().url(),
  merged_at: z.string().nullable(),
  merge_commit_sha: z.string().nullable(),
  head: z.object({
    label: z.string(),
    ref: z.string(),
    sha: z.string(),
  }),
  base: z.object({
    label: z.string(),
    ref: z.string(),
    sha: z.string(),
  }),
});

// OAuth Token Response
export const GitHubOAuthTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  scope: z.string(),
});

// Error Response
export const GitHubErrorSchema = z.object({
  message: z.string(),
  documentation_url: z.string().url().optional(),
  errors: z.array(z.object({
    resource: z.string(),
    field: z.string(),
    code: z.string(),
  })).optional(),
});

// Type exports
export type GitHubUser = z.infer<typeof GitHubUserSchema>;
export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;
export type GitHubPullRequest = z.infer<typeof GitHubPullRequestSchema>;
export type GitHubOAuthToken = z.infer<typeof GitHubOAuthTokenSchema>;
export type GitHubError = z.infer<typeof GitHubErrorSchema>;