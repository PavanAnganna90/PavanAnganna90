/**
 * Advanced Search Component
 * 
 * Comprehensive search and filtering capabilities:
 * - Multi-field search with operators
 * - Date range filtering
 * - Numeric range filtering
 * - Full-text search with highlighting
 * - Search history and saved searches
 * - Real-time search suggestions
 * - Regex pattern matching
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { debounce } from 'lodash';

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'regex';
  value: any;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface SearchQuery {
  text: string;
  filters: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  highlights?: Record<string, string[]>;
  facets?: Record<string, Array<{ value: string; count: number }>>;
  suggestions?: string[];
  executionTime: number;
}

export interface SearchField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  searchable: boolean;
  filterable: boolean;
  sortable: boolean;
  operators: SearchFilter['operator'][];
  values?: Array<{ label: string; value: any }>;
}

interface AdvancedSearchProps {
  fields: SearchField[];
  onSearch: (query: SearchQuery) => Promise<SearchResult<any>>;
  onClear?: () => void;
  placeholder?: string;
  showFilters?: boolean;
  showSorting?: boolean;
  enableHistory?: boolean;
  enableSuggestions?: boolean;
  className?: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  fields,
  onSearch,
  onClear,
  placeholder = "Search...",
  showFilters = true,
  showSorting = true,
  enableHistory = true,
  enableSuggestions = true,
  className = "",
}) => {
  const [query, setQuery] = useState<SearchQuery>({
    text: '',
    filters: [],
    sortBy: undefined,
    sortOrder: 'asc',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Load saved data from localStorage
  useEffect(() => {
    if (enableHistory) {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    }

    const saved = localStorage.getItem('savedSearches');
    if (saved) {
      setSavedSearches(JSON.parse(saved).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        lastUsed: s.lastUsed ? new Date(s.lastUsed) : undefined,
      })));
    }
  }, [enableHistory]);

  // Debounced search suggestions
  const debouncedGetSuggestions = useCallback(
    debounce(async (text: string) => {
      if (!text.trim() || !enableSuggestions) return;

      try {
        const response = await fetch('/api/search/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, fields: fields.filter(f => f.searchable) }),
        });

        if (response.ok) {
          const suggestions = await response.json();
          setSuggestions(suggestions);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    }, 300),
    [fields, enableSuggestions]
  );

  // Handle search execution
  const handleSearch = useCallback(async () => {
    if (!query.text.trim() && query.filters.length === 0) return;

    setIsLoading(true);
    setShowSuggestions(false);
    setShowHistory(false);

    try {
      const result = await onSearch(query);
      
      // Add to search history
      if (enableHistory && query.text.trim()) {
        const newHistory = [query.text, ...searchHistory.filter(h => h !== query.text)].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, onSearch, searchHistory, enableHistory]);

  // Handle clear search
  const handleClear = useCallback(() => {
    setQuery({
      text: '',
      filters: [],
      sortBy: undefined,
      sortOrder: 'asc',
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setShowHistory(false);
    onClear?.();
  }, [onClear]);

  // Add filter
  const addFilter = useCallback(() => {
    setQuery(prev => ({
      ...prev,
      filters: [...prev.filters, {
        field: fields[0]?.name || '',
        operator: 'equals',
        value: '',
        type: fields[0]?.type || 'string',
      }],
    }));
  }, [fields]);

  // Update filter
  const updateFilter = useCallback((index: number, updates: Partial<SearchFilter>) => {
    setQuery(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, ...updates } : filter
      ),
    }));
  }, []);

  // Remove filter
  const removeFilter = useCallback((index: number) => {
    setQuery(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  }, []);

  // Save search
  const saveSearch = useCallback(() => {
    if (!saveSearchName.trim()) return;

    const newSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      name: saveSearchName,
      query,
      createdAt: new Date(),
      useCount: 0,
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
    setShowSaveDialog(false);
    setSaveSearchName('');
  }, [saveSearchName, query, savedSearches]);

  // Load saved search
  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setQuery(savedSearch.query);
    
    // Update usage stats
    const updated = savedSearches.map(s => 
      s.id === savedSearch.id 
        ? { ...s, lastUsed: new Date(), useCount: s.useCount + 1 }
        : s
    );
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
    
    handleSearch();
  }, [savedSearches, handleSearch]);

  // Delete saved search
  const deleteSavedSearch = useCallback((id: string) => {
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('savedSearches', JSON.stringify(updated));
  }, [savedSearches]);

  // Get available operators for field
  const getOperatorsForField = useCallback((fieldName: string) => {
    const field = fields.find(f => f.name === fieldName);
    return field?.operators || ['equals'];
  }, [fields]);

  // Render filter input based on type
  const renderFilterInput = useCallback((filter: SearchFilter, index: number) => {
    const field = fields.find(f => f.name === filter.field);
    
    switch (filter.type) {
      case 'string':
        return (
          <input
            type="text"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter value..."
          />
        );

      case 'number':
        if (filter.operator === 'between') {
          const [min, max] = Array.isArray(filter.value) ? filter.value : [0, 100];
          return (
            <div className="flex space-x-2">
              <input
                type="number"
                value={min}
                onChange={(e) => updateFilter(index, { value: [parseFloat(e.target.value), max] })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Min"
              />
              <input
                type="number"
                value={max}
                onChange={(e) => updateFilter(index, { value: [min, parseFloat(e.target.value)] })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Max"
              />
            </div>
          );
        }
        return (
          <input
            type="number"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: parseFloat(e.target.value) })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter number..."
          />
        );

      case 'date':
        if (filter.operator === 'between') {
          const [start, end] = Array.isArray(filter.value) ? filter.value : ['', ''];
          return (
            <div className="flex space-x-2">
              <input
                type="date"
                value={start}
                onChange={(e) => updateFilter(index, { value: [e.target.value, end] })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="date"
                value={end}
                onChange={(e) => updateFilter(index, { value: [start, e.target.value] })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          );
        }
        return (
          <input
            type="date"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        );

      case 'boolean':
        return (
          <select
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value === 'true' })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      case 'array':
        if (field?.values) {
          return (
            <select
              multiple
              value={Array.isArray(filter.value) ? filter.value : []}
              onChange={(e) => updateFilter(index, { 
                value: Array.from(e.target.selectedOptions, option => option.value) 
              })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {field.values.map(val => (
                <option key={val.value} value={val.value}>{val.label}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="text"
            value={Array.isArray(filter.value) ? filter.value.join(', ') : ''}
            onChange={(e) => updateFilter(index, { value: e.target.value.split(',').map(v => v.trim()) })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter values separated by commas..."
          />
        );

      default:
        return null;
    }
  }, [fields, updateFilter]);

  // Handle text input changes
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(prev => ({ ...prev, text }));
    
    if (enableSuggestions) {
      debouncedGetSuggestions(text);
      setShowSuggestions(text.length > 0);
    }
  }, [enableSuggestions, debouncedGetSuggestions]);

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        {/* Main Search Input */}
        <div className="relative">
          <div className="flex">
            <div className="relative flex-1">
              <input
                type="text"
                value={query.text}
                onChange={handleTextChange}
                onFocus={() => enableHistory && setShowHistory(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    setShowHistory(false);
                  }
                }}
                className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={placeholder}
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex space-x-2 ml-3">
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
              
              <button
                onClick={handleClear}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear
              </button>
              
              {showFilters && (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Filters
                </button>
              )}
            </div>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(prev => ({ ...prev, text: suggestion }));
                    setShowSuggestions(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* History Dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                Recent searches
              </div>
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(prev => ({ ...prev, text: item }));
                    setShowHistory(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={addFilter}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Add Filter
              </button>
            </div>

            {query.filters.map((filter, index) => (
              <div key={index} className="flex items-center space-x-2">
                <select
                  value={filter.field}
                  onChange={(e) => {
                    const field = fields.find(f => f.name === e.target.value);
                    updateFilter(index, { 
                      field: e.target.value, 
                      type: field?.type || 'string',
                      operator: field?.operators[0] || 'equals'
                    });
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {fields.filter(f => f.filterable).map(field => (
                    <option key={field.name} value={field.name}>{field.label}</option>
                  ))}
                </select>

                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {getOperatorsForField(filter.field).map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>

                {renderFilterInput(filter, index)}

                <button
                  onClick={() => removeFilter(index)}
                  className="p-2 text-red-600 hover:text-red-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Sorting */}
            {showSorting && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">Sort by:</span>
                <select
                  value={query.sortBy || ''}
                  onChange={(e) => setQuery(prev => ({ ...prev, sortBy: e.target.value || undefined }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">None</option>
                  {fields.filter(f => f.sortable).map(field => (
                    <option key={field.name} value={field.name}>{field.label}</option>
                  ))}
                </select>
                
                <select
                  value={query.sortOrder || 'asc'}
                  onChange={(e) => setQuery(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Saved Searches</h3>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map(savedSearch => (
                <div key={savedSearch.id} className="flex items-center space-x-1">
                  <button
                    onClick={() => loadSavedSearch(savedSearch)}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md"
                  >
                    {savedSearch.name}
                  </button>
                  <button
                    onClick={() => deleteSavedSearch(savedSearch.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Search Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Save Search
          </button>
        </div>
      </div>

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Save Search</h3>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Enter search name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveSearch}
                disabled={!saveSearchName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;