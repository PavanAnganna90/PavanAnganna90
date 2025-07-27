// Core exports
export { ApiClient } from './client';
export { RetryManager, DEFAULT_RETRY_OPTIONS } from './retry';
export * from './types';
export * from './errors';

// GitHub implementation
export { GitHubClient } from './implementations/github/client';
export * from './implementations/github/schemas';

// Utility function to create preconfigured clients
export function createApiClient(name: string, config?: any) {
  switch (name) {
    case 'github':
      return new GitHubClient(config);
    default:
      throw new Error(`Unknown API client: ${name}`);
  }
}