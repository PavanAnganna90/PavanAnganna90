/**
 * Export Modal Component
 * 
 * Advanced data export functionality:
 * - Multiple export formats (CSV, JSON, Excel)
 * - Date range selection
 * - Custom field selection
 * - Compression options
 * - Email delivery
 */

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CustomMetric } from './CustomMetricsDashboard';

interface ExportModalProps {
  data: any[];
  metrics: CustomMetric[];
  onClose: () => void;
}

type ExportFormat = 'csv' | 'json' | 'excel' | 'pdf';

interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeHeaders: boolean;
  compress: boolean;
  emailDelivery: boolean;
  email?: string;
  customFields: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const ExportModal: React.FC<ExportModalProps> = ({
  data,
  metrics,
  onClose,
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeMetadata: true,
    includeHeaders: true,
    compress: false,
    emailDelivery: false,
    customFields: metrics.map(m => m.id),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!exportOptions.dateRange) return data;

    return data.filter(item => {
      const timestamp = new Date(item.timestamp);
      return timestamp >= exportOptions.dateRange!.start && 
             timestamp <= exportOptions.dateRange!.end;
    });
  }, [data, exportOptions.dateRange]);

  const processedData = useMemo(() => {
    return filteredData.map(item => {
      const processed: any = {
        timestamp: item.timestamp,
      };

      exportOptions.customFields.forEach(fieldId => {
        const metric = metrics.find(m => m.id === fieldId);
        if (metric) {
          processed[metric.name] = item[fieldId];
          if (exportOptions.includeMetadata) {
            processed[`${metric.name}_unit`] = metric.unit;
            processed[`${metric.name}_formatted`] = item[`${fieldId}_formatted`];
          }
        }
      });

      return processed;
    });
  }, [filteredData, exportOptions, metrics]);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (exportOptions.format) {
        case 'csv':
          content = generateCSV(processedData);
          filename = `metrics_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
          mimeType = 'text/csv';
          break;

        case 'json':
          content = JSON.stringify({
            exported_at: new Date().toISOString(),
            data: processedData,
            metrics: exportOptions.includeMetadata ? metrics.filter(m => 
              exportOptions.customFields.includes(m.id)
            ) : undefined,
          }, null, 2);
          filename = `metrics_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
          mimeType = 'application/json';
          break;

        case 'excel':
          content = generateExcel(processedData);
          filename = `metrics_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;

        case 'pdf':
          content = await generatePDF(processedData, metrics);
          filename = `metrics_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.pdf`;
          mimeType = 'application/pdf';
          break;

        default:
          throw new Error('Unsupported export format');
      }

      if (exportOptions.emailDelivery && exportOptions.email) {
        await sendEmail(content, filename, mimeType);
      } else {
        downloadFile(content, filename, mimeType);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = (data: any[]): string => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = exportOptions.includeHeaders ? headers.join(',') + '\n' : '';
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');

    return csvHeaders + csvRows;
  };

  const generateExcel = (data: any[]): string => {
    // In a real implementation, use a library like xlsx or exceljs
    // For now, return CSV format as fallback
    return generateCSV(data);
  };

  const generatePDF = async (data: any[], metrics: CustomMetric[]): Promise<string> => {
    // In a real implementation, use a library like jsPDF or puppeteer
    // For now, return a simple text format
    const content = [
      'Metrics Export Report',
      `Generated: ${format(new Date(), 'PPP')}`,
      '',
      'Metrics:',
      ...metrics.map(m => `- ${m.name} (${m.unit})`),
      '',
      'Data:',
      ...data.map(item => JSON.stringify(item, null, 2)),
    ].join('\n');

    return content;
  };

  const sendEmail = async (content: string, filename: string, mimeType: string) => {
    const response = await fetch('/api/export/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: exportOptions.email,
        subject: `Metrics Export - ${filename}`,
        content,
        filename,
        mimeType,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Export Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Format
            </label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as ExportFormat }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          {/* Field Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Fields to Export
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {metrics.map(metric => (
                <label key={metric.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.customFields.includes(metric.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportOptions(prev => ({
                          ...prev,
                          customFields: [...prev.customFields, metric.id]
                        }));
                      } else {
                        setExportOptions(prev => ({
                          ...prev,
                          customFields: prev.customFields.filter(id => id !== metric.id)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {metric.name} ({metric.unit})
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={exportOptions.dateRange?.start ? 
                    format(exportOptions.dateRange.start, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => {
                    const start = e.target.value ? new Date(e.target.value) : undefined;
                    setExportOptions(prev => ({
                      ...prev,
                      dateRange: start ? { ...prev.dateRange, start } : undefined
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={exportOptions.dateRange?.end ? 
                    format(exportOptions.dateRange.end, "yyyy-MM-dd'T'HH:mm") : ''}
                  onChange={(e) => {
                    const end = e.target.value ? new Date(e.target.value) : undefined;
                    setExportOptions(prev => ({
                      ...prev,
                      dateRange: end ? { ...prev.dateRange, end } : undefined
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include metadata</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeHeaders}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeHeaders: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include headers</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.compress}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, compress: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Compress file</span>
              </label>
            </div>
          </div>

          {/* Email Delivery */}
          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={exportOptions.emailDelivery}
                onChange={(e) => setExportOptions(prev => ({ ...prev, emailDelivery: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email delivery
              </span>
            </label>
            {exportOptions.emailDelivery && (
              <input
                type="email"
                placeholder="Enter email address"
                value={exportOptions.email || ''}
                onChange={(e) => setExportOptions(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview ({filteredData.length} records)
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-xs">
              <div className="text-gray-600 dark:text-gray-400">
                Format: {exportOptions.format.toUpperCase()}<br />
                Fields: {exportOptions.customFields.length} selected<br />
                Records: {filteredData.length}<br />
                {exportOptions.dateRange && (
                  <>Date range: {format(exportOptions.dateRange.start, 'PPP')} - {format(exportOptions.dateRange.end, 'PPP')}<br /></>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || exportOptions.customFields.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md"
          >
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;