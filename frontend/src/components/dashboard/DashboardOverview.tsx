'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Eye,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Activity,
  BarChart3,
} from 'lucide-react';
import { DashboardStats, ActivityLog } from '@/types/api';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/DashboardAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface DashboardOverviewProps {
  className?: string;
}

export function DashboardOverview({ className }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const [statsResponse, activityResponse] = await Promise.all([
        api.dashboard.getStats(),
        api.dashboard.getActivityLogs({ limit: 10 })
      ]);
      
      setStats(statsResponse.data);
      setActivityLogs(activityResponse.data.data);
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to load dashboard data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'login':
        return <Activity className="h-4 w-4 text-indigo-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {getGreeting()}, {user?.firstName}!
              </h1>
              <p className="text-indigo-100 mt-2">
                Welcome back to your dashboard. Here's what's happening today.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="text-sm text-indigo-100">Today</p>
                <p className="text-2xl font-semibold">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Users Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.users.total)}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className="flex items-center">
                  {stats.users.growth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={stats.users.growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(stats.users.growth)}
                  </span>
                </div>
                <span>from last month</span>
              </div>
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">
                  Active: {formatNumber(stats.users.active)} ({((stats.users.active / stats.users.total) * 100).toFixed(1)}%)
                </div>
                <Progress value={(stats.users.active / stats.users.total) * 100} className="h-1" />
              </div>
            </CardContent>
          </Card>

          {/* Posts Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.posts.total)}</div>
              <div className="text-xs text-muted-foreground">
                +{formatNumber(stats.posts.thisMonth)} this month
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Published: {formatNumber(stats.posts.published)}</span>
                  <span>Drafts: {formatNumber(stats.posts.drafts)}</span>
                </div>
                <Progress value={(stats.posts.published / stats.posts.total) * 100} className="h-1" />
              </div>
            </CardContent>
          </Card>

          {/* Views Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.engagement.totalViews)}</div>
              <div className="text-xs text-muted-foreground">
                Avg: {formatNumber(stats.engagement.avgViewsPerPost)} per post
              </div>
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">
                  Comments: {formatNumber(stats.engagement.totalComments)}
                </div>
                <Progress value={Math.min((stats.engagement.totalComments / stats.engagement.totalViews) * 100, 100)} className="h-1" />
              </div>
            </CardContent>
          </Card>

          {/* Engagement Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.engagement.totalComments / stats.engagement.totalViews) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {formatNumber(stats.engagement.totalComments)} comments on {formatNumber(stats.engagement.totalViews)} views
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {stats.engagement.totalComments > 100 ? 'High' : stats.engagement.totalComments > 50 ? 'Medium' : 'Low'} Engagement
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        {stats && stats.engagement.topPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardDescription>Your most viewed posts this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.engagement.topPosts.slice(0, 5).map((post, index) => (
                  <div key={post.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                        {post.title}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <Eye className="h-3 w-3" />
                        <span>{formatNumber(post.viewCount)} views</span>
                        <MessageSquare className="h-3 w-3" />
                        <span>{formatNumber(post.commentCount)} comments</span>
                      </div>
                    </div>
                    <Badge variant={post.status === 'PUBLISHED' ? 'success' : 'secondary'}>
                      {post.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions in your dashboard</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">
                          {log.user.firstName} {log.user.lastName}
                        </span>{' '}
                        {log.action.toLowerCase()}d a {log.resource.toLowerCase()}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you might want to perform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-5 w-5" />
              <span className="text-sm">New Post</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Users className="h-5 w-5" />
              <span className="text-sm">Add User</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm">View Analytics</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Settings className="h-5 w-5" />
              <span className="text-sm">Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}