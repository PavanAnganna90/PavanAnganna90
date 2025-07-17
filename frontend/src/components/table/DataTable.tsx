'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTable } from '@/hooks/useTable';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { Column, TableProps } from '@/types/table';

export function DataTable<T = any>({
  data,
  columns,
  keyField = 'id',
  height,
  maxHeight = '600px',
  loading = false,
  error,
  emptyMessage = 'No data available',
  selectable = false,
  expandable = false,
  sortable = true,
  filterable = true,
  searchable = true,
  paginated = true,
  pageSize = 10,
  pageSizeOptions = [5, 10, 20, 50, 100],
  density = 'normal',
  striped = true,
  bordered = true,
  hoverable = true,
  stickyHeader = true,
  resizable = true,
  className = '',
  rowClassName,
  onRowClick,
  onRowDoubleClick,
  onRowSelect,
  onSort,
  onFilter,
  onColumnResize,
  rowActions = [],
  bulkActions = [],
  toolbar = {
    search: true,
    filters: true,
    density: true,
    columns: true,
    export: false,
    refresh: false,
    fullscreen: false
  },
  footer = {
    pagination: true,
    summary: true,
    aggregations: false
  }
}: TableProps<T>) {
  
  const getRowId = (row: T, index: number) => {
    if (typeof keyField === 'string') {
      return (row as any)[keyField] ?? index;
    }
    return keyField;
  };

  const {
    data: tableData,
    state,
    pagination,
    selectedRowsData,
    visibleColumns,
    hasFilters,
    setGlobalFilter,
    setColumnFilter,
    clearFilters,
    toggleSort,
    setPageIndex,
    setPageSize,
    nextPage,
    previousPage,
    selectRow,
    selectAllRows,
    setColumnVisibility,
    setColumnSize,
    setDensity,
    isRowSelected,
    getSortDirection,
    getColumnFilter
  } = useTable({
    data,
    columns,
    getRowId,
    enableSorting: sortable,
    enableFiltering: filterable,
    enablePagination: paginated,
    enableSelection: !!selectable,
    pageSize
  });

  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, boolean>>({});
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number; columnId: string } | null>(null);

  // Enhanced keyboard navigation for table cells
  const { containerRef, registerFocusable } = useKeyboardNavigation({
    enableArrowKeys: true,
    enableTabNavigation: true,
    enableActivation: true,
    enableEscape: true,
    shortcuts: {
      'Ctrl+a': () => selectable && handleSelectAll(true),
      'Ctrl+d': () => selectable && handleSelectAll(false),
      'Ctrl+f': () => {
        const searchInput = document.querySelector('[data-table-search]') as HTMLInputElement;
        searchInput?.focus();
      },
    },
    trapFocus: false,
  });

  useEffect(() => {
    setDensity(density);
  }, [density, setDensity]);

  // Handle cell-level keyboard navigation
  const handleCellKeyDown = (event: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    const currentRow = focusedCell?.row ?? rowIndex;
    const currentCol = focusedCell?.col ?? colIndex;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (currentRow > 0) {
          setFocusedCell({ row: currentRow - 1, col: currentCol });
          focusCellAt(currentRow - 1, currentCol);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (currentRow < tableData.length - 1) {
          setFocusedCell({ row: currentRow + 1, col: currentCol });
          focusCellAt(currentRow + 1, currentCol);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (currentCol > 0) {
          setFocusedCell({ row: currentRow, col: currentCol - 1 });
          focusCellAt(currentRow, currentCol - 1);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (currentCol < visibleColumns.length - 1) {
          setFocusedCell({ row: currentRow, col: currentCol + 1 });
          focusCellAt(currentRow, currentCol + 1);
        }
        break;

      case 'Enter':
      case ' ':
        if (selectable) {
          event.preventDefault();
          const rowId = getRowId(tableData[rowIndex], rowIndex);
          handleRowSelect(rowId);
        } else if (onRowClick) {
          event.preventDefault();
          onRowClick(tableData[rowIndex], rowIndex);
        }
        break;

      case 'Home':
        event.preventDefault();
        setFocusedCell({ row: currentRow, col: 0 });
        focusCellAt(currentRow, 0);
        break;

      case 'End':
        event.preventDefault();
        setFocusedCell({ row: currentRow, col: visibleColumns.length - 1 });
        focusCellAt(currentRow, visibleColumns.length - 1);
        break;

      case 'PageUp':
        event.preventDefault();
        const pageUpRow = Math.max(0, currentRow - pageSize);
        setFocusedCell({ row: pageUpRow, col: currentCol });
        focusCellAt(pageUpRow, currentCol);
        break;

      case 'PageDown':
        event.preventDefault();
        const pageDownRow = Math.min(tableData.length - 1, currentRow + pageSize);
        setFocusedCell({ row: pageDownRow, col: currentCol });
        focusCellAt(pageDownRow, currentCol);
        break;
    }
  };

  // Focus a specific cell
  const focusCellAt = (rowIndex: number, colIndex: number) => {
    const cell = document.querySelector(
      `[data-table-cell="${rowIndex}-${colIndex}"]`
    ) as HTMLElement;
    if (cell) {
      cell.focus();
    }
  };

  const handleSort = (columnId: string, event: React.MouseEvent) => {
    const isMulti = event.metaKey || event.ctrlKey;
    toggleSort(columnId, isMulti);
    onSort?.(state.sorting);
  };

  const handleFilter = (columnId: string, value: any) => {
    setColumnFilter(columnId, value);
    onFilter?.(state.filters);
  };

  const handleRowSelect = (rowId: string | number) => {
    selectRow(rowId);
    if (onRowSelect) {
      const newSelectedRows = [...selectedRowsData];
      const rowIndex = newSelectedRows.findIndex(row => getRowId(row, 0) === rowId);
      if (rowIndex >= 0) {
        newSelectedRows.splice(rowIndex, 1);
      } else {
        const row = tableData.find((r, i) => getRowId(r, i) === rowId);
        if (row) newSelectedRows.push(row);
      }
      onRowSelect(newSelectedRows);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    selectAllRows(checked);
    onRowSelect?.(checked ? tableData : []);
  };

  const startResize = (columnId: string, event: React.MouseEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const column = visibleColumns.find(col => col.id === columnId);
    if (!column) return;

    const startWidth = state.columnSizing[columnId] || column.width || 150;
    setResizingColumn(columnId);
    resizeRef.current = { startX, startWidth: Number(startWidth), columnId };

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = e.clientX - resizeRef.current.startX;
      const newWidth = Math.max(50, resizeRef.current.startWidth + diff);
      setColumnSize(columnId, newWidth);
      onColumnResize?.({ ...state.columnSizing, [columnId]: newWidth });
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getDensityClasses = () => {
    switch (state.density) {
      case 'compact': return 'py-1 px-2 text-xs';
      case 'comfortable': return 'py-4 px-4 text-sm';
      default: return 'py-2 px-3 text-sm';
    }
  };

  const getSortIcon = (columnId: string) => {
    const direction = getSortDirection(columnId);
    if (!direction) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return direction === 'asc' ? (
      <svg className="w-4 h-4 text-kassow-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-kassow-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    );
  };

  const renderCell = (row: T, column: Column<T>, rowIndex: number, columnIndex: number) => {
    const rowId = getRowId(row, rowIndex);
    let value: any;
    
    if (typeof column.accessor === 'function') {
      value = column.accessor(row);
    } else {
      value = (row as any)[column.accessor];
    }

    if (column.cell) {
      return column.cell({
        value,
        row,
        column,
        rowIndex,
        columnIndex,
        isSelected: isRowSelected(rowId),
        isEditing: false
      });
    }

    if (column.format) {
      return column.format(value, row);
    }

    // Default formatting based on type
    switch (column.type) {
      case 'boolean':
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            value ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
          }`}>
            {value ? 'Yes' : 'No'}
          </span>
        );
      case 'status':
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            value === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
            value === 'inactive' ? 'bg-slate-500/20 text-slate-400' :
            value === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
            value === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {String(value).toUpperCase()}
          </span>
        );
      case 'badge':
        return (
          <span className="px-2 py-1 bg-kassow-accent/20 text-kassow-accent rounded text-xs font-medium">
            {value}
          </span>
        );
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      default:
        return value != null ? String(value) : '';
    }
  };

  const renderColumnFilter = (column: Column<T>) => {
    if (!column.filterable) return null;

    const currentFilter = getColumnFilter(column.id);
    const isOpen = columnFilters[column.id];

    if (column.filter?.type === 'select' && column.filter.options) {
      return (
        <select
          value={currentFilter || ''}
          onChange={(e) => handleFilter(column.id, e.target.value || null)}
          className="w-full mt-1 px-2 py-1 bg-kassow-dark border border-gray-600 rounded text-xs text-kassow-light focus:border-kassow-accent focus:outline-none"
        >
          <option value="">All</option>
          {column.filter.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={currentFilter || ''}
        onChange={(e) => handleFilter(column.id, e.target.value || null)}
        placeholder={column.filter?.placeholder || `Filter ${column.header}...`}
        className="w-full mt-1 px-2 py-1 bg-kassow-dark border border-gray-600 rounded text-xs text-kassow-light placeholder-slate-400 focus:border-kassow-accent focus:outline-none"
      />
    );
  };

  if (loading) {
    return (
      <div className={`bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kassow-accent"></div>
          <span className="ml-3 text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-red-400 mb-2">�</div>
            <div className="text-red-400 font-medium">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg ${className}`}>
      {/* Toolbar */}
      {(toolbar.search || toolbar.filters || toolbar.density || toolbar.columns || bulkActions.length > 0) && (
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            {/* Left side - Search and filters */}
            <div className="flex items-center space-x-4">
              {toolbar.search && (
                <div className="relative">
                  <input
                    type="text"
                    value={state.globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search all columns... (Ctrl+F)"
                    className="w-64 pl-10 pr-4 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light placeholder-slate-400 focus:border-kassow-accent focus:outline-none"
                    data-table-search
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-xs bg-slate-600 text-slate-300 rounded hover:bg-slate-500 transition-colors"
                >
                  Clear Filters
                </button>
              )}

              {selectedRowsData.length > 0 && bulkActions.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-400">
                    {selectedRowsData.length} selected
                  </span>
                  {bulkActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => action.onClick(selectedRowsData)}
                      disabled={action.disabled?.(selectedRowsData)}
                      className={`px-3 py-2 text-xs rounded transition-colors ${
                        action.variant === 'danger' 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-kassow-accent text-white hover:bg-kassow-accent-hover'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {action.icon && <span className="mr-1">{action.icon}</span>}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right side - View options */}
            <div className="flex items-center space-x-2">
              {toolbar.density && (
                <div className="relative">
                  <button
                    onClick={() => setShowDensityMenu(!showDensityMenu)}
                    className="px-3 py-2 text-slate-400 hover:text-kassow-light transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  {showDensityMenu && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-kassow-darker border border-gray-700/50 rounded-lg shadow-lg z-10">
                      {(['compact', 'normal', 'comfortable'] as const).map(option => (
                        <button
                          key={option}
                          onClick={() => {
                            setDensity(option);
                            setShowDensityMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            state.density === option
                              ? 'text-kassow-accent bg-kassow-accent/10'
                              : 'text-slate-300 hover:bg-slate-700/50'
                          }`}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {toolbar.columns && (
                <div className="relative">
                  <button
                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                    className="px-3 py-2 text-slate-400 hover:text-kassow-light transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m-6 0H9" />
                    </svg>
                  </button>
                  {showColumnMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-kassow-darker border border-gray-700/50 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {columns.map(column => (
                        <label key={column.id} className="flex items-center px-3 py-2 hover:bg-slate-700/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={state.columnVisibility[column.id] !== false}
                            onChange={(e) => setColumnVisibility(column.id, e.target.checked)}
                            className="mr-2 rounded border-gray-600 bg-kassow-dark text-kassow-accent focus:ring-kassow-accent"
                          />
                          <span className="text-sm text-slate-300">{column.header}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div 
        ref={(node) => {
          if (node) {
            (tableRef as any).current = node;
            (containerRef as any).current = node;
          }
        }}
        className="overflow-auto focus:outline-none"
        style={{ height, maxHeight }}
        role="grid"
        aria-label="Data table with keyboard navigation"
        aria-rowcount={tableData.length + 1} // +1 for header
        aria-colcount={visibleColumns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}
        tabIndex={0}
      >
        <table className="w-full" role="presentation">
          {/* Header */}
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} bg-kassow-darker/90 backdrop-blur`}>
            <tr className={bordered ? 'border-b border-gray-700/50' : ''}>
              {selectable && (
                <th className={`${getDensityClasses()} text-left font-medium text-slate-400 border-r border-gray-700/50`} style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedRowsData.length === tableData.length && tableData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-600 bg-kassow-dark text-kassow-accent focus:ring-kassow-accent"
                  />
                </th>
              )}
              
              {visibleColumns.map((column, index) => (
                <th
                  key={column.id}
                  className={`${getDensityClasses()} text-left font-medium text-slate-400 relative group ${
                    bordered && index < visibleColumns.length - 1 ? 'border-r border-gray-700/50' : ''
                  }`}
                  style={{
                    width: state.columnSizing[column.id] || column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    textAlign: column.align || 'left'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className={`flex items-center space-x-2 ${column.sortable ? 'cursor-pointer hover:text-kassow-light' : ''}`}
                      onClick={column.sortable ? (e) => handleSort(column.id, e) : undefined}
                    >
                      <span>{column.header}</span>
                      {column.sortable && getSortIcon(column.id)}
                    </div>
                    
                    {filterable && (
                      <button
                        onClick={() => setColumnFilters(prev => ({
                          ...prev,
                          [column.id]: !prev[column.id]
                        }))}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-600/50 rounded transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                        </svg>
                      </button>
                    )}

                    {resizable && (
                      <div
                        className="absolute right-0 top-0 w-2 h-full cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => startResize(column.id, e)}
                      />
                    )}
                  </div>
                  
                  {columnFilters[column.id] && renderColumnFilter(column)}
                </th>
              ))}
              
              {rowActions.length > 0 && (
                <th className={`${getDensityClasses()} text-left font-medium text-slate-400`} style={{ width: '80px' }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td 
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)}
                  className="py-12 text-center text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              tableData.map((row, rowIndex) => {
                const rowId = getRowId(row, rowIndex);
                const isSelected = isRowSelected(rowId);
                const rowClass = typeof rowClassName === 'function' 
                  ? rowClassName(row, rowIndex) 
                  : rowClassName || '';

                return (
                  <tr
                    key={rowId}
                    className={`
                      ${striped && rowIndex % 2 === 1 ? 'bg-slate-800/20' : ''}
                      ${hoverable ? 'hover:bg-slate-700/30' : ''}
                      ${isSelected ? 'bg-kassow-accent/20' : ''}
                      ${bordered ? 'border-b border-gray-700/30' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${rowClass}
                      transition-colors
                    `}
                    onClick={() => onRowClick?.(row, rowIndex)}
                    onDoubleClick={() => onRowDoubleClick?.(row, rowIndex)}
                  >
                    {selectable && (
                      <td className={`${getDensityClasses()} border-r border-gray-700/50`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(rowId)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-600 bg-kassow-dark text-kassow-accent focus:ring-kassow-accent"
                        />
                      </td>
                    )}
                    
                    {visibleColumns.map((column, columnIndex) => (
                      <td
                        key={column.id}
                        data-table-cell={`${rowIndex}-${columnIndex}`}
                        tabIndex={focusedCell?.row === rowIndex && focusedCell?.col === columnIndex ? 0 : -1}
                        className={`${getDensityClasses()} text-kassow-light focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 dark:focus:bg-blue-900/20 ${
                          bordered && columnIndex < visibleColumns.length - 1 ? 'border-r border-gray-700/30' : ''
                        } ${focusedCell?.row === rowIndex && focusedCell?.col === columnIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        style={{ textAlign: column.align || 'left' }}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIndex, columnIndex)}
                        onFocus={() => setFocusedCell({ row: rowIndex, col: columnIndex })}
                        role="gridcell"
                        aria-rowindex={rowIndex + 2} // +1 for header, +1 for 1-based indexing
                        aria-colindex={columnIndex + 1}
                        aria-selected={selectable ? isRowSelected(getRowId(row, rowIndex)) : undefined}
                      >
                        {renderCell(row, column, rowIndex, columnIndex)}
                      </td>
                    ))}
                    
                    {rowActions.length > 0 && (
                      <td className={getDensityClasses()}>
                        <div className="flex items-center space-x-2">
                          {rowActions.map(action => (
                            <button
                              key={action.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(row);
                              }}
                              disabled={action.disabled?.(row)}
                              className={`p-1 rounded transition-colors ${
                                action.variant === 'danger'
                                  ? 'text-red-400 hover:bg-red-500/20'
                                  : 'text-slate-400 hover:bg-slate-600/50 hover:text-kassow-light'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={action.label}
                            >
                              {action.icon || (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {footer.pagination && paginated && (
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">
                Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} entries
              </span>
              
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
              >
                {pageSizeOptions.map(size => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={previousPage}
                disabled={!pagination.hasPreviousPage}
                className="px-3 py-2 text-sm bg-slate-600 text-slate-300 rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = pagination.pageIndex < 3 
                    ? i 
                    : pagination.pageIndex > pagination.totalPages - 3
                    ? pagination.totalPages - 5 + i
                    : pagination.pageIndex - 2 + i;
                  
                  if (pageNum < 0 || pageNum >= pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPageIndex(pageNum)}
                      className={`px-3 py-2 text-sm rounded transition-colors ${
                        pageNum === pagination.pageIndex
                          ? 'bg-kassow-accent text-white'
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={nextPage}
                disabled={!pagination.hasNextPage}
                className="px-3 py-2 text-sm bg-slate-600 text-slate-300 rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}