'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TableState, Column, FilterValue, SortConfig } from '@/types/table';

interface UseTableOptions<T> {
  data: T[];
  columns: Column<T>[];
  initialState?: Partial<TableState<T>>;
  getRowId?: (row: T) => string | number;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSelection?: boolean;
  pageSize?: number;
}

export function useTable<T = any>({
  data,
  columns,
  initialState = {},
  getRowId = (_, index) => index,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableSelection = true,
  pageSize = 10
}: UseTableOptions<T>) {
  
  const [state, setState] = useState<TableState<T>>({
    data: [],
    filteredData: [],
    selectedRows: new Set(),
    expandedRows: new Set(),
    sorting: [],
    filters: {},
    pagination: {
      pageIndex: 0,
      pageSize,
      total: 0
    },
    columnVisibility: {},
    columnOrder: columns.map(col => col.id),
    columnSizing: {},
    globalFilter: '',
    density: 'normal',
    loading: false,
    ...initialState
  });

  // Apply filters
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply global filter
    if (state.globalFilter) {
      const searchTerm = state.globalFilter.toLowerCase();
      result = result.filter(row => {
        return columns.some(column => {
          if (!column.filterable) return false;
          
          let value: any;
          if (typeof column.accessor === 'function') {
            value = column.accessor(row);
          } else {
            value = row[column.accessor];
          }
          
          if (value == null) return false;
          
          return String(value).toLowerCase().includes(searchTerm);
        });
      });
    }

    // Apply column filters
    Object.entries(state.filters).forEach(([columnId, filterValue]) => {
      if (!filterValue) return;
      
      const column = columns.find(col => col.id === columnId);
      if (!column) return;

      result = result.filter(row => {
        let value: any;
        if (typeof column.accessor === 'function') {
          value = column.accessor(row);
        } else {
          value = row[column.accessor];
        }

        if (value == null) return false;

        // Handle different filter types
        if (typeof filterValue === 'string') {
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        }

        if (Array.isArray(filterValue)) {
          return filterValue.includes(value);
        }

        if (typeof filterValue === 'object' && filterValue.type) {
          const filter = filterValue as FilterValue;
          switch (filter.operator) {
            case 'equals':
              return value === filter.value;
            case 'contains':
              return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'startsWith':
              return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
            case 'endsWith':
              return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
            case 'gt':
              return Number(value) > Number(filter.value);
            case 'lt':
              return Number(value) < Number(filter.value);
            case 'gte':
              return Number(value) >= Number(filter.value);
            case 'lte':
              return Number(value) <= Number(filter.value);
            case 'between':
              const [min, max] = filter.value;
              return Number(value) >= Number(min) && Number(value) <= Number(max);
            case 'in':
              return filter.value.includes(value);
            case 'notIn':
              return !filter.value.includes(value);
            default:
              return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          }
        }

        return true;
      });
    });

    return result;
  }, [data, state.globalFilter, state.filters, columns]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!enableSorting || state.sorting.length === 0) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      for (const sort of state.sorting) {
        const column = columns.find(col => col.id === sort.columnId);
        if (!column) continue;

        let aValue: any;
        let bValue: any;

        if (typeof column.accessor === 'function') {
          aValue = column.accessor(a);
          bValue = column.accessor(b);
        } else {
          aValue = a[column.accessor];
          bValue = b[column.accessor];
        }

        // Handle null/undefined values
        if (aValue == null && bValue == null) continue;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Compare values based on type
        let comparison = 0;
        if (column.type === 'number') {
          comparison = Number(aValue) - Number(bValue);
        } else if (column.type === 'date') {
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }, [filteredData, state.sorting, columns, enableSorting]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    if (!enablePagination) {
      return sortedData;
    }

    const start = state.pagination.pageIndex * state.pagination.pageSize;
    const end = start + state.pagination.pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, state.pagination, enablePagination]);

  // Update state when data changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      data,
      filteredData: sortedData,
      pagination: {
        ...prev.pagination,
        total: sortedData.length
      }
    }));
  }, [data, sortedData]);

  // Actions
  const setGlobalFilter = useCallback((filter: string) => {
    setState(prev => ({
      ...prev,
      globalFilter: filter,
      pagination: { ...prev.pagination, pageIndex: 0 }
    }));
  }, []);

  const setColumnFilter = useCallback((columnId: string, value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [columnId]: value
      },
      pagination: { ...prev.pagination, pageIndex: 0 }
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      globalFilter: '',
      pagination: { ...prev.pagination, pageIndex: 0 }
    }));
  }, []);

  const setSorting = useCallback((sorting: SortConfig[]) => {
    setState(prev => ({
      ...prev,
      sorting,
      pagination: { ...prev.pagination, pageIndex: 0 }
    }));
  }, []);

  const toggleSort = useCallback((columnId: string, multi: boolean = false) => {
    setState(prev => {
      let newSorting: SortConfig[];
      
      if (multi) {
        const existingSort = prev.sorting.find(s => s.columnId === columnId);
        if (existingSort) {
          if (existingSort.direction === 'asc') {
            newSorting = prev.sorting.map(s => 
              s.columnId === columnId ? { ...s, direction: 'desc' as const } : s
            );
          } else {
            newSorting = prev.sorting.filter(s => s.columnId !== columnId);
          }
        } else {
          newSorting = [...prev.sorting, { columnId, direction: 'asc' }];
        }
      } else {
        const existingSort = prev.sorting.find(s => s.columnId === columnId);
        if (existingSort && existingSort.direction === 'asc') {
          newSorting = [{ columnId, direction: 'desc' }];
        } else if (existingSort && existingSort.direction === 'desc') {
          newSorting = [];
        } else {
          newSorting = [{ columnId, direction: 'asc' }];
        }
      }

      return {
        ...prev,
        sorting: newSorting,
        pagination: { ...prev.pagination, pageIndex: 0 }
      };
    });
  }, []);

  const setPageIndex = useCallback((pageIndex: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, pageIndex }
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState(prev => ({
      ...prev,
      pagination: { 
        ...prev.pagination, 
        pageSize, 
        pageIndex: 0 
      }
    }));
  }, []);

  const nextPage = useCallback(() => {
    setState(prev => {
      const maxPage = Math.ceil(prev.pagination.total / prev.pagination.pageSize) - 1;
      return {
        ...prev,
        pagination: {
          ...prev.pagination,
          pageIndex: Math.min(prev.pagination.pageIndex + 1, maxPage)
        }
      };
    });
  }, []);

  const previousPage = useCallback(() => {
    setState(prev => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        pageIndex: Math.max(prev.pagination.pageIndex - 1, 0)
      }
    }));
  }, []);

  const selectRow = useCallback((rowId: string | number) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedRows);
      if (newSelected.has(rowId)) {
        newSelected.delete(rowId);
      } else {
        newSelected.add(rowId);
      }
      return { ...prev, selectedRows: newSelected };
    });
  }, []);

  const selectAllRows = useCallback((select: boolean = true) => {
    setState(prev => {
      if (select) {
        const allIds = new Set(paginatedData.map((row, index) => getRowId(row, index)));
        return { ...prev, selectedRows: allIds };
      } else {
        return { ...prev, selectedRows: new Set() };
      }
    });
  }, [paginatedData, getRowId]);

  const toggleRowExpansion = useCallback((rowId: string | number) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedRows);
      if (newExpanded.has(rowId)) {
        newExpanded.delete(rowId);
      } else {
        newExpanded.add(rowId);
      }
      return { ...prev, expandedRows: newExpanded };
    });
  }, []);

  const setColumnVisibility = useCallback((columnId: string, visible: boolean) => {
    setState(prev => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        [columnId]: visible
      }
    }));
  }, []);

  const setColumnSize = useCallback((columnId: string, size: number) => {
    setState(prev => ({
      ...prev,
      columnSizing: {
        ...prev.columnSizing,
        [columnId]: size
      }
    }));
  }, []);

  const setColumnOrder = useCallback((columnOrder: string[]) => {
    setState(prev => ({
      ...prev,
      columnOrder
    }));
  }, []);

  const setDensity = useCallback((density: TableState['density']) => {
    setState(prev => ({ ...prev, density }));
  }, []);

  // Computed values
  const pagination = useMemo(() => ({
    pageIndex: state.pagination.pageIndex,
    pageSize: state.pagination.pageSize,
    total: state.pagination.total,
    totalPages: Math.ceil(state.pagination.total / state.pagination.pageSize),
    hasNextPage: state.pagination.pageIndex < Math.ceil(state.pagination.total / state.pagination.pageSize) - 1,
    hasPreviousPage: state.pagination.pageIndex > 0
  }), [state.pagination]);

  const selectedRowsData = useMemo(() => {
    return paginatedData.filter((row, index) => 
      state.selectedRows.has(getRowId(row, index))
    );
  }, [paginatedData, state.selectedRows, getRowId]);

  const visibleColumns = useMemo(() => {
    return columns
      .filter(column => state.columnVisibility[column.id] !== false)
      .sort((a, b) => {
        const aIndex = state.columnOrder.indexOf(a.id);
        const bIndex = state.columnOrder.indexOf(b.id);
        return aIndex - bIndex;
      });
  }, [columns, state.columnVisibility, state.columnOrder]);

  const hasFilters = useMemo(() => {
    return state.globalFilter !== '' || Object.values(state.filters).some(filter => 
      filter !== null && filter !== undefined && filter !== ''
    );
  }, [state.globalFilter, state.filters]);

  return {
    // Data
    data: paginatedData,
    filteredData: sortedData,
    allData: data,
    
    // State
    state,
    setState,
    
    // Computed
    pagination,
    selectedRowsData,
    visibleColumns,
    hasFilters,
    
    // Actions
    setGlobalFilter,
    setColumnFilter,
    clearFilters,
    setSorting,
    toggleSort,
    setPageIndex,
    setPageSize,
    nextPage,
    previousPage,
    selectRow,
    selectAllRows,
    toggleRowExpansion,
    setColumnVisibility,
    setColumnSize,
    setColumnOrder,
    setDensity,
    
    // Utilities
    getRowId,
    isRowSelected: (rowId: string | number) => state.selectedRows.has(rowId),
    isRowExpanded: (rowId: string | number) => state.expandedRows.has(rowId),
    getSortDirection: (columnId: string) => {
      const sort = state.sorting.find(s => s.columnId === columnId);
      return sort?.direction;
    },
    getColumnFilter: (columnId: string) => state.filters[columnId],
    getColumnSize: (columnId: string) => state.columnSizing[columnId],
    isColumnVisible: (columnId: string) => state.columnVisibility[columnId] !== false
  };
}