/**
 * Metric Builder Modal Component
 * 
 * Advanced metric creation and editing:
 * - Query builder with visual interface
 * - Aggregation function selection
 * - Threshold configuration
 * - Category and tag management
 * - Preview functionality
 */

import React, { useState, useEffect } from 'react';
import { CustomMetric } from './CustomMetricsDashboard';

interface MetricBuilderModalProps {
  metric?: CustomMetric;
  onSave: (metric: Omit<CustomMetric, 'id' | 'createdAt' | 'updatedAt'> | CustomMetric) => void;
  onCancel: () => void;
  existingMetrics: CustomMetric[];
}

interface MetricFormData {
  name: string;
  description: string;
  query: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  category: string;
  unit: string;
  color: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  tags: string[];
}

const PREDEFINED_CATEGORIES = [
  'Infrastructure',
  'Application',
  'Database',
  'Network',
  'Security',
  'Performance',
  'Business',
  'Custom'
];

const PREDEFINED_UNITS = [
  'bytes',
  'kilobytes',
  'megabytes',
  'gigabytes',
  'requests',
  'errors',
  'milliseconds',
  'seconds',
  'minutes',
  'count',
  'percent',
  'rate',
  'custom'
];

const COLOR_PRESETS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#F472B6', '#A78BFA', '#34D399', '#FBBF24'
];

export const MetricBuilderModal: React.FC<MetricBuilderModalProps> = ({
  metric,
  onSave,
  onCancel,
  existingMetrics,
}) => {
  const [formData, setFormData] = useState<MetricFormData>({
    name: metric?.name || '',
    description: metric?.description || '',
    query: metric?.query || '',
    aggregation: metric?.aggregation || 'avg',
    category: metric?.category || 'Custom',
    unit: metric?.unit || 'count',
    color: metric?.color || COLOR_PRESETS[0],
    threshold: metric?.threshold || undefined,
    tags: metric?.tags || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [queryBuilder, setQueryBuilder] = useState({
    source: '',
    filters: [] as Array<{ field: string; operator: string; value: string }>,
    groupBy: '',
  });

  const isEditing = !!metric;

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (existingMetrics.some(m => m.name === formData.name && m.id !== metric?.id)) {
      newErrors.name = 'Name already exists';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.query.trim()) {
      newErrors.query = 'Query is required';
    }

    if (formData.threshold) {
      if (formData.threshold.warning <= 0) {
        newErrors.warningThreshold = 'Warning threshold must be positive';
      }
      if (formData.threshold.critical <= 0) {
        newErrors.criticalThreshold = 'Critical threshold must be positive';
      }
      if (formData.threshold.warning >= formData.threshold.critical) {
        newErrors.thresholds = 'Warning threshold must be less than critical threshold';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const metricData = {
      ...formData,
      ...(isEditing && { id: metric.id, createdAt: metric.createdAt, updatedAt: new Date() }),
    };

    onSave(metricData);
  };

  // Preview query
  const handlePreview = async () => {
    if (!formData.query.trim()) return;

    setPreviewLoading(true);
    try {
      const response = await fetch('/api/metrics/custom/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: formData.query,
          aggregation: formData.aggregation,
          timeRange: '1h',
        }),
      });

      if (!response.ok) throw new Error('Preview failed');

      const data = await response.json();
      setPreviewData(data);
    } catch (error) {
      setErrors({ preview: 'Failed to preview query' });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  // Build query from visual builder
  const buildQuery = () => {
    let query = queryBuilder.source;
    
    if (queryBuilder.filters.length > 0) {
      const filters = queryBuilder.filters
        .map(f => `${f.field} ${f.operator} ${f.value}`)
        .join(' AND ');
      query += ` | where ${filters}`;
    }
    
    if (queryBuilder.groupBy) {
      query += ` | group by ${queryBuilder.groupBy}`;
    }
    
    setFormData(prev => ({ ...prev, query }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Metric' : 'Create New Metric'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Basic Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter metric name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Describe what this metric measures"
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unit
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {PREDEFINED_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="flex space-x-2">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-gray-900 dark:border-white' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded border-2 border-gray-300"
                    />
                  </div>
                </div>
              </div>

              {/* Query Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Query Configuration
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Aggregation Function
                  </label>
                  <select
                    value={formData.aggregation}
                    onChange={(e) => setFormData(prev => ({ ...prev, aggregation: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                    <option value="count">Count</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Query *
                  </label>
                  <textarea
                    value={formData.query}
                    onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm ${
                      errors.query ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Enter your query (e.g., metrics.cpu_usage | where host='server1')"
                  />
                  {errors.query && <p className="mt-1 text-sm text-red-500">{errors.query}</p>}
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewLoading || !formData.query.trim()}
                    className="mt-2 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded"
                  >
                    {previewLoading ? 'Loading...' : 'Preview'}
                  </button>
                </div>

                {previewData && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Preview Results</h4>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                      <pre>{JSON.stringify(previewData, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-r-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Thresholds */}
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={!!formData.threshold}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    threshold: e.target.checked ? { warning: 0, critical: 0 } : undefined
                  }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Thresholds
                </span>
              </label>
              
              {formData.threshold && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Warning Threshold
                    </label>
                    <input
                      type="number"
                      value={formData.threshold.warning}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        threshold: { ...prev.threshold!, warning: parseFloat(e.target.value) }
                      }))}
                      className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.warningThreshold ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.warningThreshold && <p className="mt-1 text-sm text-red-500">{errors.warningThreshold}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                      Critical Threshold
                    </label>
                    <input
                      type="number"
                      value={formData.threshold.critical}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        threshold: { ...prev.threshold!, critical: parseFloat(e.target.value) }
                      }))}
                      className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.criticalThreshold ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.criticalThreshold && <p className="mt-1 text-sm text-red-500">{errors.criticalThreshold}</p>}
                  </div>
                  {errors.thresholds && (
                    <div className="col-span-2">
                      <p className="text-sm text-red-500">{errors.thresholds}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                {isEditing ? 'Update Metric' : 'Create Metric'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MetricBuilderModal;