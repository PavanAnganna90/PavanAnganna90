'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface Column<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  rowActions?: (row: T, index: number) => React.ReactNode;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
  className?: string;
  // Local sorting/filtering for client-side operations
  enableLocalSort?: boolean;
  enableLocalSearch?: boolean;
  enableLocalFilter?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  totalCount,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  onSort,
  onSearch,
  onFilter,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  rowActions,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  className,
  enableLocalSort = false,
  enableLocalSearch = false,
  enableLocalFilter = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Local data processing (if enabled)
  const processedData = useMemo(() => {
    let result = [...data];

    // Local search
    if (enableLocalSearch && searchQuery) {
      const searchableColumns = columns.filter(col => col.searchable !== false);
      result = result.filter(row =>
        searchableColumns.some(col => {
          const value = row[col.key];
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      );
    }

    // Local filter
    if (enableLocalFilter && Object.keys(filters).length > 0) {
      result = result.filter(row =>
        Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          const rowValue = row[key];
          if (Array.isArray(value)) {
            return value.includes(rowValue);
          }
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
        })
      );
    }

    // Local sort
    if (enableLocalSort && sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === bValue) return 0;
        
        const isAscending = sortConfig.direction === 'asc';
        
        if (aValue == null) return isAscending ? -1 : 1;
        if (bValue == null) return isAscending ? 1 : -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return isAscending 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return isAscending ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
      });
    }

    return result;
  }, [data, searchQuery, sortConfig, filters, enableLocalSearch, enableLocalFilter, enableLocalSort, columns]);

  // Pagination calculations
  const totalItems = totalCount ?? processedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const displayData = enableLocalSort || enableLocalSearch || enableLocalFilter
    ? processedData.slice(startIndex, startIndex + pageSize)
    : data;

  const handleSort = (key: keyof T) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    const newDirection = 
      sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    
    const newSortConfig = { key, direction: newDirection };
    setSortConfig(newSortConfig);
    
    if (enableLocalSort) {
      // Local sorting handled in useMemo
    } else {
      onSort?.(key, newDirection);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (enableLocalSearch) {
      // Local search handled in useMemo
    } else {
      onSearch?.(query);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? displayData : []);
  };

  const handleSelectRow = (row: T, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedRows, row]);
    } else {
      onSelectionChange(selectedRows.filter(selectedRow => selectedRow !== row));
    }
  };

  const isAllSelected = displayData.length > 0 && selectedRows.length === displayData.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < displayData.length;

  const getSortIcon = (columnKey: keyof T) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const filterableColumns = columns.filter(col => col.filterable);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          {/* Filter Toggle */}
          {filterableColumns.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-50' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="pageSize" className="text-sm">
            Show:
          </Label>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange?.(parseInt(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && filterableColumns.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterableColumns.map((column) => (
              <div key={String(column.key)} className="space-y-2">
                <Label htmlFor={`filter-${String(column.key)}`}>
                  {column.label}
                </Label>
                <Input
                  id={`filter-${String(column.key)}`}
                  placeholder={`Filter by ${column.label}`}
                  value={filters[column.key as string] || ''}
                  onChange={(e) => {
                    const newFilters = { ...filters, [column.key]: e.target.value };
                    setFilters(newFilters);
                    if (!enableLocalFilter) {
                      onFilter?.(newFilters);
                    }
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({});
                if (!enableLocalFilter) {
                  onFilter?.({});
                }
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && getSortIcon(column.key)}
                    </div>
                  </th>
                ))}
                {rowActions && (
                  <th className="w-16 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                    className="px-4 py-8 text-center"
                  >
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                displayData.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {selectable && (
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedRows.includes(row)}
                          onChange={(e) => handleSelectRow(row, e.target.checked)}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={cn(
                          'px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.className
                        )}
                      >
                        {column.render
                          ? column.render(row[column.key], row, index)
                          : String(row[column.key] ?? '')
                        }
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-4 text-right">
                        {rowActions(row, index)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange?.(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for common row actions
export function RowActions({ 
  onView, 
  onEdit, 
  onDelete,
  canView = true,
  canEdit = true,
  canDelete = true,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canView && onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
        )}
        {canEdit && onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canDelete && onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}