'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatDistanceToNow } from 'date-fns';
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Tag,
  Users,
  Clock,
  FileText,
  Code,
  MessageSquare,
  TrendingUp,
  Filter,
  RefreshCw,
  ExternalLink,
  User,
  Calendar,
  Activity
} from 'lucide-react';

interface GitActivity {
  id: string;
  type: 'commit' | 'merge' | 'pr' | 'tag' | 'review';
  action: string;
  author: {
    name: string;
    email: string;
    avatar?: string;
  };
  repository: string;
  branch?: string;
  target?: string;
  title: string;
  description?: string;
  timestamp: Date;
  stats?: {
    additions: number;
    deletions: number;
    files: number;
  };
  reviewers?: string[];
  labels?: string[];
  url?: string;
}

interface ContributorStats {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
  prs: number;
}

export function GitActivityFeed() {
  const [activities, setActivities] = useState<GitActivity[]>(mockActivities);
  const [filter, setFilter] = useState<'all' | 'commits' | 'prs' | 'merges'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [contributors, setContributors] = useState<ContributorStats[]>(mockContributors);

  // WebSocket for real-time git activity
  const { subscribe, connectionStatus } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
    autoConnect: true
  });

  useEffect(() => {
    const unsubscribe = subscribe('git_activity', (message) => {
      if (message.type === 'git_activity_new') {
        setActivities(prev => [message.payload as GitActivity, ...prev].slice(0, 50));
      }
    });

    return unsubscribe;
  }, [subscribe]);

  const typeConfig = {
    commit: { icon: GitCommit, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    merge: { icon: GitMerge, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    pr: { icon: GitPullRequest, color: 'text-green-500', bg: 'bg-green-500/10' },
    tag: { icon: Tag, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    review: { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-500/10' }
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'commits' && activity.type === 'commit') return true;
    if (filter === 'prs' && (activity.type === 'pr' || activity.type === 'review')) return true;
    if (filter === 'merges' && activity.type === 'merge') return true;
    return false;
  });

  // Calculate stats
  const todayStats = {
    commits: activities.filter(a => a.type === 'commit').length,
    prs: activities.filter(a => a.type === 'pr').length,
    merges: activities.filter(a => a.type === 'merge').length,
    contributors: new Set(activities.map(a => a.author.email)).size
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Git Activity</h2>
          <p className="text-muted-foreground">Repository activity and team contributions</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </Badge>
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commits Today</p>
                <p className="text-2xl font-bold">{todayStats.commits}</p>
              </div>
              <GitCommit className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pull Requests</p>
                <p className="text-2xl font-bold">{todayStats.prs}</p>
              </div>
              <GitPullRequest className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Merges</p>
                <p className="text-2xl font-bold">{todayStats.merges}</p>
              </div>
              <GitMerge className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contributors</p>
                <p className="text-2xl font-bold">{todayStats.contributors}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b">
            {[
              { value: 'all', label: 'All Activity' },
              { value: 'commits', label: 'Commits' },
              { value: 'prs', label: 'Pull Requests' },
              { value: 'merges', label: 'Merges' }
            ].map((tab) => (
              <button
                key={tab.value}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  filter === tab.value 
                    ? "border-blue-500 text-blue-600" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setFilter(tab.value as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Activity List */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
              
              {filteredActivities.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No activity to display
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Contributors */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contributors.map((contributor, index) => (
                <ContributorRow 
                  key={contributor.name} 
                  contributor={contributor} 
                  rank={index + 1} 
                />
              ))}
            </CardContent>
          </Card>

          {/* Repository Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Repository Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Branches</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open PRs</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Code Coverage</span>
                <span className="font-semibold text-green-500">87%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Build Success Rate</span>
                <span className="font-semibold text-green-500">95%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: GitActivity }) {
  const typeConfig = {
    commit: { icon: GitCommit, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    merge: { icon: GitMerge, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    pr: { icon: GitPullRequest, color: 'text-green-500', bg: 'bg-green-500/10' },
    tag: { icon: Tag, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    review: { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-500/10' }
  };

  const config = typeConfig[activity.type];
  const Icon = config.icon;

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg mt-1", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Avatar className="h-6 w-6">
                  <img 
                    src={activity.author.avatar || `https://ui-avatars.com/api/?name=${activity.author.name}`} 
                    alt={activity.author.name}
                  />
                </Avatar>
                <span className="font-medium">{activity.author.name}</span>
                <span className="text-sm text-muted-foreground">{activity.action}</span>
              </div>
              
              <h4 className="font-medium mt-1">{activity.title}</h4>
              
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </span>
                {activity.repository && (
                  <span className="flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    {activity.repository}
                  </span>
                )}
                {activity.branch && (
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {activity.branch}
                  </span>
                )}
              </div>

              {activity.stats && (
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-green-600">+{activity.stats.additions}</span>
                  <span className="text-red-600">-{activity.stats.deletions}</span>
                  <span className="text-muted-foreground">{activity.stats.files} files</span>
                </div>
              )}

              {activity.labels && activity.labels.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {activity.labels.map(label => (
                    <Badge key={label} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {activity.url && (
              <Button size="sm" variant="ghost" asChild>
                <a href={activity.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributorRow({ 
  contributor, 
  rank 
}: { 
  contributor: ContributorStats; 
  rank: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-lg font-bold text-muted-foreground w-6">
        {rank}
      </div>
      <Avatar className="h-8 w-8">
        <img 
          src={`https://ui-avatars.com/api/?name=${contributor.name}`} 
          alt={contributor.name}
        />
      </Avatar>
      <div className="flex-1">
        <div className="font-medium">{contributor.name}</div>
        <div className="text-xs text-muted-foreground">
          {contributor.commits} commits, {contributor.prs} PRs
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-green-600">+{contributor.additions}</div>
        <div className="text-xs text-red-600">-{contributor.deletions}</div>
      </div>
    </div>
  );
}

// Mock data - replace with real data
const mockActivities: GitActivity[] = [
  {
    id: '1',
    type: 'commit',
    action: 'pushed to',
    author: {
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatar: 'https://ui-avatars.com/api/?name=Sarah+Chen'
    },
    repository: 'frontend',
    branch: 'main',
    title: 'feat: Add real-time monitoring dashboard',
    description: 'Implemented WebSocket connections for live metrics updates and improved dashboard performance',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    stats: { additions: 245, deletions: 32, files: 8 },
    url: 'https://github.com/org/repo/commit/abc123'
  },
  {
    id: '2',
    type: 'pr',
    action: 'opened pull request',
    author: {
      name: 'Mike Johnson',
      email: 'mike@example.com',
      avatar: 'https://ui-avatars.com/api/?name=Mike+Johnson'
    },
    repository: 'backend',
    title: '#142: Fix authentication token expiry issue',
    description: 'This PR addresses the token refresh logic and adds better error handling for expired sessions',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    labels: ['bug', 'auth', 'high-priority'],
    reviewers: ['sarah', 'alex'],
    url: 'https://github.com/org/repo/pull/142'
  },
  {
    id: '3',
    type: 'merge',
    action: 'merged',
    author: {
      name: 'Alex Rodriguez',
      email: 'alex@example.com',
      avatar: 'https://ui-avatars.com/api/?name=Alex+Rodriguez'
    },
    repository: 'infrastructure',
    branch: 'feature/k8s-autoscaling',
    target: 'main',
    title: 'Implement Kubernetes autoscaling policies',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    stats: { additions: 512, deletions: 89, files: 12 },
    url: 'https://github.com/org/repo/pull/138'
  },
  {
    id: '4',
    type: 'review',
    action: 'reviewed',
    author: {
      name: 'Emma Wilson',
      email: 'emma@example.com',
      avatar: 'https://ui-avatars.com/api/?name=Emma+Wilson'
    },
    repository: 'frontend',
    title: 'Code review on #145: Update dashboard components',
    description: 'LGTM! Just a few minor suggestions on the TypeScript types',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    url: 'https://github.com/org/repo/pull/145'
  },
  {
    id: '5',
    type: 'tag',
    action: 'created tag',
    author: {
      name: 'David Park',
      email: 'david@example.com',
      avatar: 'https://ui-avatars.com/api/?name=David+Park'
    },
    repository: 'backend',
    title: 'v2.3.0',
    description: 'Release 2.3.0 - Performance improvements and bug fixes',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    url: 'https://github.com/org/repo/releases/tag/v2.3.0'
  }
];

const mockContributors: ContributorStats[] = [
  { name: 'Sarah Chen', commits: 45, additions: 3420, deletions: 890, prs: 12 },
  { name: 'Mike Johnson', commits: 38, additions: 2890, deletions: 567, prs: 8 },
  { name: 'Alex Rodriguez', commits: 32, additions: 2345, deletions: 456, prs: 10 },
  { name: 'Emma Wilson', commits: 28, additions: 1890, deletions: 234, prs: 6 },
  { name: 'David Park', commits: 22, additions: 1567, deletions: 189, prs: 5 }
];