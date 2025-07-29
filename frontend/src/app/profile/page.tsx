'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  github_username: string;
  full_name: string;
  email: string;
  avatar_url: string;
  bio?: string;
  company?: string;
  location?: string;
  blog?: string;
  created_at: string;
  last_login?: string;
  roles: string[];
  permissions: string[];
}

/**
 * User Profile Page
 */
export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load mock user data to avoid API dependencies
    const loadData = async () => {
      setIsLoading(true);
      
      // Mock user data
      const mockUser: User = {
        id: 'user_1',
        github_username: 'johndoe',
        full_name: 'John Doe',
        email: 'john.doe@company.com',
        avatar_url: 'https://github.com/johndoe.png',
        bio: 'Senior Software Engineer passionate about DevOps and cloud infrastructure.',
        company: 'Acme Corporation',
        location: 'San Francisco, CA',
        blog: 'https://johndoe.dev',
        created_at: '2023-01-01T00:00:00Z',
        last_login: '2024-01-15T10:30:00Z',
        roles: ['developer', 'team-lead'],
        permissions: ['project:write', 'deploy:staging', 'team:manage']
      };

      setTimeout(() => {
        setUser(mockUser);
        setIsLoading(false);
      }, 1000);
    };

    loadData();
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'team-lead': return 'bg-blue-100 text-blue-800';
      case 'developer': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {user.full_name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              </div>

              {/* User details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {user.full_name}
                    </h1>
                    <p className="text-lg text-gray-600">@{user.github_username}</p>
                  </div>
                  
                  <Button variant="outline">
                    Edit Profile
                  </Button>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="mt-4 text-gray-700">{user.bio}</p>
                )}

                {/* Roles and Permissions */}
                <div className="mt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Roles & Permissions</h3>
                    <div className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Assigned Roles</dt>
                        <dd className="mt-1 flex flex-wrap gap-2">
                          {user.roles.map((role) => (
                            <Badge key={role} className={`text-xs ${getRoleColor(role)}`}>
                              {role}
                            </Badge>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Permissions</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {user.permissions.length} permissions across {user.roles.length} roles
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile details */}
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 border-t pt-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              
              {user.company && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.company}</dd>
                </div>
              )}
              
              {user.location && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.location}</dd>
                </div>
              )}
              
              {user.blog && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Website</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <a 
                      href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500"
                    >
                      {user.blog}
                    </a>
                  </dd>
                </div>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Member since</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</dd>
              </div>
              
              {user.last_login && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last login</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(user.last_login)}</dd>
                </div>
              )}
            </div>

            {/* Permissions Detail */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Detailed Permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {user.permissions.map((permission) => (
                  <div key={permission} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-900">
                      {permission}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 border-t pt-6 flex justify-end space-x-3">
              <Button variant="outline">
                Change Password
              </Button>
              <Button variant="destructive">
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}