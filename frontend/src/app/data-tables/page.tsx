'use client';

import React, { useState, useMemo } from 'react';
import { DataTable } from '@/components/table';
import { Column } from '@/types/table';

interface DemoData {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: number;
  isVerified: boolean;
  salary: number;
}

export default function DataTablesPage() {
  const [activeDemo, setActiveDemo] = useState<'basic' | 'advanced' | 'server'>('basic');

  // Generate demo data
  const demoData: DemoData[] = useMemo(() => {
    const roles = ['Admin', 'Developer', 'Designer', 'Manager', 'Analyst', 'Support'];
    const departments = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Support'];
    const statuses: DemoData['status'][] = ['active', 'inactive', 'pending'];
    
    return Array.from({ length: 100 }, (_, i) => ({
      id: `user-${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@opssight.com`,
      role: roles[Math.floor(Math.random() * roles.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      permissions: Math.floor(Math.random() * 10) + 1,
      isVerified: Math.random() > 0.2,
      salary: Math.floor(Math.random() * 150000) + 50000
    }));
  }, []);

  // Basic table columns
  const basicColumns: Column<DemoData>[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
      filterable: true,
      filter: {
        type: 'text',
        placeholder: 'Search names...'
      }
    },
    {
      id: 'email',
      header: 'Email',
      accessor: 'email',
      sortable: true,
      filterable: true
    },
    {
      id: 'role',
      header: 'Role',
      accessor: 'role',
      sortable: true,
      filterable: true,
      filter: {
        type: 'select',
        options: [
          { value: 'Admin', label: 'Admin' },
          { value: 'Developer', label: 'Developer' },
          { value: 'Designer', label: 'Designer' },
          { value: 'Manager', label: 'Manager' },
          { value: 'Analyst', label: 'Analyst' },
          { value: 'Support', label: 'Support' }
        ]
      }
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      type: 'status',
      sortable: true,
      filterable: true,
      filter: {
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'pending', label: 'Pending' }
        ]
      }
    },
    {
      id: 'lastLogin',
      header: 'Last Login',
      accessor: 'lastLogin',
      type: 'date',
      sortable: true
    }
  ];

  // Advanced table columns with custom formatting
  const advancedColumns: Column<DemoData>[] = [
    {
      id: 'user',
      header: 'User',
      accessor: 'name',
      sortable: true,
      filterable: true,
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {row.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="text-kassow-light font-medium">{row.name}</div>
            <div className="text-slate-400 text-xs">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      id: 'role',
      header: 'Role & Department',
      accessor: 'role',
      sortable: true,
      filterable: true,
      cell: ({ row }) => (
        <div>
          <div className="text-kassow-light font-medium">{row.role}</div>
          <div className="text-slate-400 text-xs">{row.department}</div>
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      type: 'status',
      sortable: true,
      filterable: true
    },
    {
      id: 'verified',
      header: 'Verified',
      accessor: 'isVerified',
      type: 'boolean',
      sortable: true,
      filterable: true
    },
    {
      id: 'permissions',
      header: 'Permissions',
      accessor: 'permissions',
      sortable: true,
      cell: ({ value }) => (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-slate-700 rounded-full h-2">
            <div 
              className="bg-kassow-accent h-2 rounded-full transition-all"
              style={{ width: `${(value / 10) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{value}/10</span>
        </div>
      )
    },
    {
      id: 'salary',
      header: 'Salary',
      accessor: 'salary',
      type: 'number',
      sortable: true,
      format: (value) => `$${value.toLocaleString()}`,
      align: 'right'
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      type: 'date',
      sortable: true,
      format: (value) => {
        const date = new Date(value);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
      }
    }
  ];

  const rowActions = [
    {
      id: 'edit',
      label: 'Edit',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: (row: DemoData) => alert(`Edit user: ${row.name}`)
    },
    {
      id: 'delete',
      label: 'Delete',
      variant: 'danger' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: (row: DemoData) => alert(`Delete user: ${row.name}`),
      disabled: (row: DemoData) => row.role === 'Admin'
    }
  ];

  const bulkActions = [
    {
      id: 'activate',
      label: 'Activate Selected',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      onClick: (selectedRows: DemoData[]) => alert(`Activate ${selectedRows.length} users`)
    },
    {
      id: 'deactivate',
      label: 'Deactivate Selected',
      variant: 'danger' as const,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      onClick: (selectedRows: DemoData[]) => alert(`Deactivate ${selectedRows.length} users`)
    }
  ];

  return (
    <div className="min-h-screen bg-kassow-dark">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-kassow-light mb-2">Data Tables</h1>
          <p className="text-slate-400">Responsive, sortable, and filterable data tables with advanced features</p>
        </div>

        {/* Demo Tabs */}
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg mb-6">
          <div className="flex border-b border-gray-700/50">
            {[
              { key: 'basic', label: 'Basic Table', description: 'Simple table with sorting and filtering' },
              { key: 'advanced', label: 'Advanced Table', description: 'Custom cells, actions, and formatting' },
              { key: 'server', label: 'Server-side', description: 'Pagination and filtering on server' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveDemo(tab.key as any)}
                className={`flex-1 px-6 py-4 text-left transition-colors ${
                  activeDemo === tab.key
                    ? 'text-kassow-accent border-b-2 border-kassow-accent bg-kassow-accent/5'
                    : 'text-slate-400 hover:text-kassow-light hover:bg-slate-800/20'
                }`}
              >
                <div className="font-medium">{tab.label}</div>
                <div className="text-xs mt-1 opacity-75">{tab.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="space-y-6">
          {activeDemo === 'basic' && (
            <div>
              <h2 className="text-xl font-semibold text-kassow-light mb-4">Basic Data Table</h2>
              <DataTable
                data={demoData}
                columns={basicColumns}
                paginated
                searchable
                sortable
                filterable
                pageSize={15}
                className="mb-6"
              />
              
              <div className="bg-kassow-darker/30 backdrop-blur border border-gray-700/50 rounded-lg p-4">
                <h3 className="text-kassow-light font-medium mb-2">Features:</h3>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>" Global search across all columns</li>
                  <li>" Column-specific filtering</li>
                  <li>" Multi-column sorting</li>
                  <li>" Pagination with configurable page sizes</li>
                  <li>" Responsive design</li>
                </ul>
              </div>
            </div>
          )}

          {activeDemo === 'advanced' && (
            <div>
              <h2 className="text-xl font-semibold text-kassow-light mb-4">Advanced Data Table</h2>
              <DataTable
                data={demoData}
                columns={advancedColumns}
                paginated
                searchable
                sortable
                filterable
                selectable="multiple"
                pageSize={10}
                rowActions={rowActions}
                bulkActions={bulkActions}
                density="comfortable"
                onRowClick={(row) => console.log('Row clicked:', row)}
                onRowSelect={(selectedRows) => console.log('Selected rows:', selectedRows)}
                className="mb-6"
              />
              
              <div className="bg-kassow-darker/30 backdrop-blur border border-gray-700/50 rounded-lg p-4">
                <h3 className="text-kassow-light font-medium mb-2">Advanced Features:</h3>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li>" Custom cell rendering with rich content</li>
                  <li>" Row and bulk actions</li>
                  <li>" Row selection with checkboxes</li>
                  <li>" Custom formatting functions</li>
                  <li>" Click handlers for rows</li>
                  <li>" Conditional action states</li>
                  <li>" Progress bars and status indicators</li>
                </ul>
              </div>
            </div>
          )}

          {activeDemo === 'server' && (
            <div>
              <h2 className="text-xl font-semibold text-kassow-light mb-4">Server-side Data Table</h2>
              <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">=§</div>
                <h3 className="text-kassow-light font-semibold mb-2">Server-side Implementation</h3>
                <p className="text-slate-400 mb-4">
                  This would integrate with your backend API for server-side pagination, filtering, and sorting.
                </p>
                <div className="bg-kassow-dark rounded-lg p-4 text-left">
                  <h4 className="text-kassow-light font-medium mb-2">Example API Integration:</h4>
                  <pre className="text-emerald-400 text-sm overflow-x-auto">
{`// Server-side table props
<DataTable
  url="/api/users"
  params={{ department: 'engineering' }}
  transform={(response) => ({
    data: response.users,
    total: response.totalCount
  })}
  debounceMs={300}
  cachingStrategy="sessionStorage"
/>`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Code Examples */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-kassow-light mb-4">Usage Examples</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Usage */}
            <div className="bg-kassow-darker/30 backdrop-blur border border-gray-700/50 rounded-lg p-4">
              <h3 className="text-kassow-light font-medium mb-3">Basic Usage</h3>
              <pre className="text-emerald-400 text-xs overflow-x-auto">
{`import { DataTable } from '@/components/table';

const columns = [
  {
    id: 'name',
    header: 'Name',
    accessor: 'name',
    sortable: true,
    filterable: true
  },
  {
    id: 'email',
    header: 'Email',
    accessor: 'email',
    sortable: true
  }
];

<DataTable
  data={users}
  columns={columns}
  paginated
  searchable
  pageSize={20}
/>`}
              </pre>
            </div>

            {/* Custom Cell */}
            <div className="bg-kassow-darker/30 backdrop-blur border border-gray-700/50 rounded-lg p-4">
              <h3 className="text-kassow-light font-medium mb-3">Custom Cell Rendering</h3>
              <pre className="text-emerald-400 text-xs overflow-x-auto">
{`const columns = [
  {
    id: 'user',
    header: 'User',
    accessor: 'name',
    cell: ({ row }) => (
      <div className="flex items-center">
        <Avatar user={row} />
        <div>
          <div>{row.name}</div>
          <div className="text-xs">
            {row.email}
          </div>
        </div>
      </div>
    )
  }
];`}
              </pre>
            </div>

            {/* Actions */}
            <div className="bg-kassow-darker/30 backdrop-blur border border-gray-700/50 rounded-lg p-4">
              <h3 className="text-kassow-light font-medium mb-3">Row Actions</h3>
              <pre className="text-emerald-400 text-xs overflow-x-auto">
{`const rowActions = [
  {
    id: 'edit',
    label: 'Edit',
    icon: <EditIcon />,
    onClick: (row) => editUser(row.id)
  },
  {
    id: 'delete',
    label: 'Delete',
    variant: 'danger',
    onClick: (row) => deleteUser(row.id),
    disabled: (row) => !canDelete(row)
  }
];

<DataTable
  data={users}
  columns={columns}
  rowActions={rowActions}
/>`}
              </pre>
            </div>

            {/* Filtering */}
            <div className="bg-kassow-darker/30 backdrop-blur border border-gray-700/50 rounded-lg p-4">
              <h3 className="text-kassow-light font-medium mb-3">Advanced Filtering</h3>
              <pre className="text-emerald-400 text-xs overflow-x-auto">
{`const columns = [
  {
    id: 'role',
    header: 'Role',
    accessor: 'role',
    filterable: true,
    filter: {
      type: 'select',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' }
      ]
    }
  },
  {
    id: 'salary',
    header: 'Salary',
    accessor: 'salary',
    filterable: true,
    filter: {
      type: 'number',
      placeholder: 'Min salary...'
    }
  }
];`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}