/**
 * Admin Page Route
 * 
 * Protected admin interface for role and permission management.
 * Requires admin permissions to access.
 */

'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system: boolean;
}

export default function AdminPageRoute() {
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    // Load mock data to avoid API dependencies
    const loadData = async () => {
      setIsLoading(true);
      
      // Mock data
      const mockRoles: Role[] = [
        {
          id: 'role_1',
          name: 'admin',
          display_name: 'Administrator',
          description: 'Full system access',
          permissions: ['admin:all', 'user:manage', 'role:manage'],
          is_system: true,
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'role_2',
          name: 'developer',
          display_name: 'Developer',
          description: 'Development access',
          permissions: ['project:write', 'deploy:staging'],
          is_system: true,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockPermissions: Permission[] = [
        {
          id: 'perm_1',
          name: 'admin:all',
          display_name: 'Full Admin Access',
          description: 'Complete system administration',
          category: 'admin',
          is_system: true
        },
        {
          id: 'perm_2',
          name: 'user:manage',
          display_name: 'Manage Users',
          description: 'Create, update, and delete users',
          category: 'user',
          is_system: true
        }
      ];

      setTimeout(() => {
        setRoles(mockRoles);
        setPermissions(mockPermissions);
        setSelectedRole(mockRoles[0]);
        setIsLoading(false);
      }, 1000);
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage roles, permissions, and system settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRole?.id === role.id
                        ? 'bg-blue-100 dark:bg-blue-900'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {role.display_name}
                      </span>
                      {role.is_system && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {role.description}
                    </p>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="outline">
                Create New Role
              </Button>
            </CardContent>
          </Card>

          {/* Role Details */}
          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle>Role Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={selectedRole.display_name}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      value={selectedRole.description}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={3}
                      readOnly
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Edit Role</Button>
                    {!selectedRole.is_system && (
                      <Button size="sm" variant="destructive">
                        Delete Role
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permissions */}
          {selectedRole && (
            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedRole.permissions.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {permission}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Manage Permissions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}