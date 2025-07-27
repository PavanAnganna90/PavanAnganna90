'use client';

import React from 'react';
import { useGitHubDashboardMetrics } from '@/hooks/useDashboard';
import { useGitHubSync } from '@/hooks/useGitHub';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Github, 
  RefreshCw, 
  Star, 
  GitFork, 
  Code, 
  TrendingUp,
  Calendar,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface GitHubIntegrationDashboardProps {
  className?: string;
}

const GitHubIntegrationDashboard: React.FC<GitHubIntegrationDashboardProps> = ({ className }) => {
  const {
    isConnected,
    profile,
    repositories,
    stats,
    insights,
    activity,
    isLoading,
    error,
    refetch
  } = useGitHubDashboardMetrics();

  const syncMutation = useGitHubSync();

  const handleSync = () => {
    syncMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading GitHub integration...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <Github className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">GitHub Integration</h3>
          <p className="text-gray-600 mb-4">
            Connect your GitHub account to see detailed analytics and insights.
          </p>
          <Button>
            <Github className="h-4 w-4 mr-2" />
            Connect GitHub
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Error Loading GitHub Data</h3>
          <p className="text-gray-600 mb-4">
            Failed to load GitHub integration data.
          </p>
          <Button onClick={refetch}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">GitHub Integration</h2>
              <p className="text-sm text-gray-600">
                Connected as @{profile?.login}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </Button>
            {profile && (
              <a
                href={profile.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                View Profile
              </a>
            )}
          </div>
        </div>

        {/* Sync Status */}
        {syncMutation.data && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Sync {syncMutation.data.success ? 'Completed' : 'Failed'}
              </span>
            </div>
            {syncMutation.data.changes.length > 0 && (
              <ul className="mt-2 text-sm text-green-700">
                {syncMutation.data.changes.map((change, index) => (
                  <li key={index}>• {change}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Code className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.totalRepos}</p>
              <p className="text-sm text-gray-600">Repositories</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{stats.totalStars}</p>
              <p className="text-sm text-gray-600">Total Stars</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <GitFork className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{stats.totalForks}</p>
              <p className="text-sm text-gray-600">Total Forks</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{stats.languages.length}</p>
              <p className="text-sm text-gray-600">Languages</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Insights */}
      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Language Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Language Distribution</h3>
            {insights.languageStats && Object.keys(insights.languageStats).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(insights.languageStats)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([language, count]) => {
                    const percentage = (count / insights.totalRepositories) * 100;
                    return (
                      <div key={language} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium">{language}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[100px]">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{count}</span>
                          <span>({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-gray-500">No language data available</p>
            )}
          </Card>

          {/* Top Repositories */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Most Starred Repositories</h3>
            {insights.mostStarred && insights.mostStarred.length > 0 ? (
              <div className="space-y-3">
                {insights.mostStarred.slice(0, 5).map((repo: any) => (
                  <div key={repo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        <a 
                          href={repo.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {repo.name}
                        </a>
                      </h4>
                      {repo.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="h-3 w-3" />
                        {repo.forks_count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No repository data available</p>
            )}
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      {repositories && repositories.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Repository Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.slice(0, 6).map((repo: any) => (
              <div key={repo.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
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
                  <div className="flex items-center gap-2">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {repo.language}
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Languages */}
      {stats.languages.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Technologies Used</h3>
          <div className="flex flex-wrap gap-2">
            {stats.languages.map((language) => (
              <Badge key={language} variant="outline">
                {language}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GitHubIntegrationDashboard;