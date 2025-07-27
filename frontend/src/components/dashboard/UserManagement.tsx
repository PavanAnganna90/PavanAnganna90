'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Shield,
  User as UserIcon,
  Mail,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import { User, UserRole, CreateUserRequest, UpdateUserRequest, UserQueryParams } from '@/types/api';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useRoleAccess } from '@/contexts/DashboardAuthContext';
import { createUserSchema, updateUserSchema, CreateUserFormData, UpdateUserFormData } from '@/lib/validations';
import { DataTable, Column, RowActions } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UserManagementProps {
  className?: string;
}

export function UserManagement({ className }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<UserQueryParams>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const { addToast } = useToast();
  const { isAdmin, canAccess } = useRoleAccess('ADMIN');

  // Load users
  const loadUsers = async (newFilters?: UserQueryParams) => {
    try {
      setLoading(true);
      const params = { ...filters, ...newFilters };
      const response = await api.users.getAll(params);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to load users',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Table columns
  const columns: Column<User>[] = [
    {
      key: 'avatar',
      label: '',
      width: '60px',
      render: (_, user) => (
        <div className="flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'firstName',
      label: 'Name',
      sortable: true,
      searchable: true,
      render: (_, user) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            @{user.username}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      searchable: true,
      render: (email) => (
        <div className="flex items-center">
          <Mail className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-gray-900 dark:text-white">{email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      filterable: true,
      render: (role) => (
        <Badge variant={role === UserRole.ADMIN ? 'default' : 'secondary'}>
          <Shield className="w-3 h-3 mr-1" />
          {role}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      filterable: true,
      render: (isActive) => (
        <Badge variant={isActive ? 'success' : 'destructive'}>
          {isActive ? (
            <>
              <UserCheck className="w-3 h-3 mr-1" />
              Active
            </>
          ) : (
            <>
              <UserX className="w-3 h-3 mr-1" />
              Inactive
            </>
          )}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (createdAt) => (
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="w-4 h-4 mr-2" />
          {new Date(createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      label: 'Last Login',
      sortable: true,
      render: (lastLoginAt) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {lastLoginAt ? new Date(lastLoginAt).toLocaleDateString() : 'Never'}
        </div>
      ),
    },
  ];

  // Handle table actions
  const handleSort = (key: keyof User, direction: 'asc' | 'desc') => {
    const newFilters = { ...filters, sortBy: key as any, sortOrder: direction };
    setFilters(newFilters);
    loadUsers(newFilters);
  };

  const handleSearch = (query: string) => {
    const newFilters = { ...filters, search: query, page: 1 };
    setFilters(newFilters);
    loadUsers(newFilters);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    loadUsers(newFilters);
  };

  const handlePageSizeChange = (limit: number) => {
    const newFilters = { ...filters, limit, page: 1 };
    setFilters(newFilters);
    loadUsers(newFilters);
  };

  // User actions
  const handleCreateUser = async (data: CreateUserFormData) => {
    try {
      await api.users.create(data);
      addToast({
        title: 'Success',
        message: 'User created successfully',
        type: 'success',
      });
      setIsCreateModalOpen(false);
      loadUsers();
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to create user',
        type: 'error',
      });
    }
  };

  const handleUpdateUser = async (data: UpdateUserFormData) => {
    if (!selectedUser) return;

    try {
      await api.users.update(selectedUser.id, data);
      addToast({
        title: 'Success',
        message: 'User updated successfully',
        type: 'success',
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to update user',
        type: 'error',
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      await api.users.delete(user.id);
      addToast({
        title: 'Success',
        message: 'User deleted successfully',
        type: 'success',
      });
      loadUsers();
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to delete user',
        type: 'error',
      });
    }
  };

  // Row actions
  const getRowActions = (user: User) => (
    <RowActions
      onView={() => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
      }}
      onEdit={() => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
      }}
      onDelete={() => handleDeleteUser(user)}
      canEdit={isAdmin}
      canDelete={isAdmin}
    />
  );

  if (!canAccess()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access user management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">User Management</CardTitle>
              <CardDescription>
                Manage users, roles, and permissions in your organization
              </CardDescription>
            </div>
            {isAdmin && (
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <CreateUserModal onSubmit={handleCreateUser} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={users}
            columns={columns}
            loading={loading}
            totalCount={pagination.total}
            pageSize={pagination.limit}
            currentPage={pagination.page}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSort={handleSort}
            onSearch={handleSearch}
            searchPlaceholder="Search users by name, email, or username..."
            emptyMessage="No users found"
            rowActions={getRowActions}
          />
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          {selectedUser && (
            <EditUserModal
              user={selectedUser}
              onSubmit={handleUpdateUser}
              onClose={() => {
                setIsEditModalOpen(false);
                setSelectedUser(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View User Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-lg">
          {selectedUser && (
            <ViewUserModal
              user={selectedUser}
              onClose={() => {
                setIsViewModalOpen(false);
                setSelectedUser(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create User Modal
function CreateUserModal({ onSubmit }: { onSubmit: (data: CreateUserFormData) => void }) {
  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      username: '',
      firstName: '',
      lastName: '',
      password: '',
      role: UserRole.USER,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New User</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              {...form.register('firstName')}
              className={form.formState.errors.firstName ? 'border-red-500' : ''}
            />
            {form.formState.errors.firstName && (
              <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              {...form.register('lastName')}
              className={form.formState.errors.lastName ? 'border-red-500' : ''}
            />
            {form.formState.errors.lastName && (
              <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...form.register('username')}
            className={form.formState.errors.username ? 'border-red-500' : ''}
          />
          {form.formState.errors.username && (
            <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            className={form.formState.errors.email ? 'border-red-500' : ''}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            {...form.register('password')}
            className={form.formState.errors.password ? 'border-red-500' : ''}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={form.watch('role')}
            onValueChange={(value) => form.setValue('role', value as UserRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.USER}>User</SelectItem>
              <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit">Create User</Button>
        </div>
      </form>
    </>
  );
}

// Edit User Modal
function EditUserModal({
  user,
  onSubmit,
  onClose,
}: {
  user: User;
  onSubmit: (data: UpdateUserFormData) => void;
  onClose: () => void;
}) {
  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit User</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              {...form.register('firstName')}
              className={form.formState.errors.firstName ? 'border-red-500' : ''}
            />
            {form.formState.errors.firstName && (
              <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              {...form.register('lastName')}
              className={form.formState.errors.lastName ? 'border-red-500' : ''}
            />
            {form.formState.errors.lastName && (
              <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...form.register('username')}
            className={form.formState.errors.username ? 'border-red-500' : ''}
          />
          {form.formState.errors.username && (
            <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            className={form.formState.errors.email ? 'border-red-500' : ''}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={form.watch('role')}
            onValueChange={(value) => form.setValue('role', value as UserRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.USER}>User</SelectItem>
              <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            {...form.register('isActive')}
            className="rounded border-gray-300"
          />
          <Label htmlFor="isActive">Active User</Label>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Update User</Button>
        </div>
      </form>
    </>
  );
}

// View User Modal
function ViewUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>User Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-500">Email</Label>
            <p className="mt-1">{user.email}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500">Role</Label>
            <div className="mt-1">
              <Badge variant={user.role === UserRole.ADMIN ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500">Status</Label>
            <div className="mt-1">
              <Badge variant={user.isActive ? 'success' : 'destructive'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500">Created</Label>
            <p className="mt-1">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500">Last Login</Label>
            <p className="mt-1">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  );
}