'use client';

import React from 'react';
import { useGitHubStatus, useGitHubProfile, useGitHubActivity, usePaginatedRepositories } from '@/hooks/useGitHub';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Github, Star, GitFork, Code, Calendar, ExternalLink } from 'lucide-react';

interface GitHubDashboardProps {
  className?: string;
}

const GitHubDashboard: React.FC<GitHubDashboardProps> = ({ className }) => {
  const { isConnected, isLoading: statusLoading, error: statusError } = useGitHubStatus();
  const { data: profile, isLoading: profileLoading } = useGitHubProfile();
  const { data: activity, isLoading: activityLoading } = useGitHubActivity();
  const { 
    data: repositories, 
    isLoading: reposLoading,
    options,
    setSort,
    setType,
    nextPage,
    previousPage,
    hasNextPage,
    hasPreviousPage
  } = usePaginatedRepositories({ per_page: 6 });

  const isLoading = statusLoading || profileLoading || activityLoading || reposLoading;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading GitHub data...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <Github className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">GitHub Not Connected</h3>
          <p className="text-gray-600 mb-4">
            Connect your GitHub account to see your repositories and activity.
          </p>
          <Button>
            Connect GitHub
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Overview */}
      {profile && (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <img
              src={profile.githubProfile.avatar_url}
              alt={profile.githubProfile.name || profile.githubProfile.login}
              className="w-16 h-16 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">
                  {profile.githubProfile.name || profile.githubProfile.login}
                </h2>
                <Badge variant="secondary">@{profile.githubProfile.login}</Badge>
              </div>
              {profile.githubProfile.bio && (
                <p className="text-gray-600 mb-3">{profile.githubProfile.bio}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {profile.githubProfile.location && (
                  <span>📍 {profile.githubProfile.location}</span>
                )}
                {profile.githubProfile.company && (
                  <span>🏢 {profile.githubProfile.company}</span>
                )}
                <span>👥 {profile.githubProfile.followers} followers</span>
                <span>👤 {profile.githubProfile.following} following</span>
              </div>
            </div>
            <a
              href={profile.githubProfile.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        </Card>
      )}

      {/* Statistics */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Code className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{profile.stats.totalRepos}</p>
                <p className="text-sm text-gray-600">Repositories</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{profile.stats.totalStars}</p>
                <p className="text-sm text-gray-600">Total Stars</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <GitFork className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{profile.stats.totalForks}</p>
                <p className="text-sm text-gray-600">Total Forks</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{profile.stats.languages.length}</p>
                <p className="text-sm text-gray-600">Languages</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Languages */}
      {profile && profile.stats.languages.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {profile.stats.languages.map((language) => (
              <Badge key={language} variant="outline">
                {language}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Repositories */}
      {repositories && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Repositories</h3>
            <div className="flex gap-2">
              <select
                value={options.sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Recently Created</option>
                <option value="pushed">Recently Pushed</option>
                <option value="full_name">Name</option>
              </select>
              <select
                value={options.type}
                onChange={(e) => setType(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="owner">Owner</option>
                <option value="all">All</option>
                <option value="member">Member</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {repositories.repositories.map((repo) => (
              <Card key={repo.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-blue-600 hover:text-blue-800">
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                      {repo.name}
                    </a>
                  </h4>
                  {repo.private && (
                    <Badge variant="secondary" className="text-xs">Private</Badge>
                  )}
                </div>
                
                {repo.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {repo.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      {repo.forks_count}
                    </span>
                  </div>
                  <span>
                    Updated {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {options.page} of {Math.ceil((repositories.pagination.total || 0) / (options.per_page || 10))}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={previousPage}
                disabled={!hasPreviousPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={!hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GitHubDashboard;