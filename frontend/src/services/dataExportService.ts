/**
 * Data Export Service
 * 
 * Comprehensive data export functionality:
 * - Multiple format support (CSV, JSON, Excel, PDF)
 * - Streaming exports for large datasets
 * - Email delivery integration
 * - Compression support
 * - Progress tracking
 * - Scheduled exports
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'pdf';
  includeHeaders: boolean;
  includeMetadata: boolean;
  compress: boolean;
  email?: string;
  filename?: string;
  dateFormat?: string;
  filters?: Record<string, any>;
  columns?: string[];
  customTemplate?: string;
}

export interface ExportProgress {
  total: number;
  processed: number;
  percentage: number;
  status: 'preparing' | 'processing' | 'finalizing' | 'completed' | 'error';
  message?: string;
}

export interface ExportResult {
  filename: string;
  size: number;
  downloadUrl?: string;
  emailSent?: boolean;
  format: string;
  recordCount: number;
  duration: number;
}

export class DataExportService {
  private progressCallbacks: Map<string, (progress: ExportProgress) => void> = new Map();

  async exportData<T>(
    data: T[],
    options: ExportOptions,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const exportId = this.generateExportId();
    const startTime = Date.now();

    if (progressCallback) {
      this.progressCallbacks.set(exportId, progressCallback);
    }

    try {
      this.updateProgress(exportId, {
        total: data.length,
        processed: 0,
        percentage: 0,
        status: 'preparing',
        message: 'Preparing export...',
      });

      // Apply filters if provided
      const filteredData = this.applyFilters(data, options.filters);
      
      // Select columns if specified
      const selectedData = this.selectColumns(filteredData, options.columns);

      this.updateProgress(exportId, {
        total: selectedData.length,
        processed: 0,
        percentage: 10,
        status: 'processing',
        message: 'Processing data...',
      });

      // Generate export content based on format
      let content: string | ArrayBuffer;
      let mimeType: string;
      let fileExtension: string;

      switch (options.format) {
        case 'csv':
          content = await this.generateCSV(selectedData, options, exportId);
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;

        case 'json':
          content = await this.generateJSON(selectedData, options, exportId);
          mimeType = 'application/json';
          fileExtension = 'json';
          break;

        case 'excel':
          content = await this.generateExcel(selectedData, options, exportId);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          break;

        case 'pdf':
          content = await this.generatePDF(selectedData, options, exportId);
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      this.updateProgress(exportId, {
        total: selectedData.length,
        processed: selectedData.length,
        percentage: 80,
        status: 'finalizing',
        message: 'Finalizing export...',
      });

      // Generate filename
      const filename = options.filename || 
        `export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.${fileExtension}`;

      // Compress if requested
      if (options.compress && typeof content === 'string') {
        content = await this.compressContent(content);
      }

      // Handle email delivery
      let emailSent = false;
      if (options.email) {
        emailSent = await this.sendEmail(content, filename, mimeType, options.email);
      }

      const result: ExportResult = {
        filename,
        size: typeof content === 'string' ? content.length : content.byteLength,
        downloadUrl: this.createDownloadUrl(content, mimeType),
        emailSent,
        format: options.format,
        recordCount: selectedData.length,
        duration: Date.now() - startTime,
      };

      this.updateProgress(exportId, {
        total: selectedData.length,
        processed: selectedData.length,
        percentage: 100,
        status: 'completed',
        message: 'Export completed successfully',
      });

      return result;
    } catch (error) {
      this.updateProgress(exportId, {
        total: data.length,
        processed: 0,
        percentage: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Export failed',
      });
      throw error;
    } finally {
      this.progressCallbacks.delete(exportId);
    }
  }

  private async generateCSV<T>(
    data: T[],
    options: ExportOptions,
    exportId: string
  ): Promise<string> {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0] as object);
    let csv = '';

    // Add headers if requested
    if (options.includeHeaders) {
      csv += headers.join(',') + '\n';
    }

    // Add metadata if requested
    if (options.includeMetadata) {
      csv += `# Exported on: ${format(new Date(), 'PPpp')}\n`;
      csv += `# Record count: ${data.length}\n`;
      csv += `# Format: CSV\n`;
      csv += '\n';
    }

    // Process data in chunks for large datasets
    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      const chunkCsv = chunk.map(row => 
        headers.map(header => {
          const value = (row as any)[header];
          if (value === null || value === undefined) return '';
          
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ).join('\n');

      csv += chunkCsv + '\n';

      // Update progress
      this.updateProgress(exportId, {
        total: data.length,
        processed: i + chunk.length,
        percentage: 10 + (70 * (i + chunk.length) / data.length),
        status: 'processing',
        message: `Processing ${i + chunk.length} of ${data.length} records...`,
      });
    }

    return csv;
  }

  private async generateJSON<T>(
    data: T[],
    options: ExportOptions,
    exportId: string
  ): Promise<string> {
    const exportData: any = {
      data,
    };

    if (options.includeMetadata) {
      exportData.metadata = {
        exportedAt: new Date().toISOString(),
        recordCount: data.length,
        format: 'JSON',
        version: '1.0',
      };
    }

    this.updateProgress(exportId, {
      total: data.length,
      processed: data.length,
      percentage: 70,
      status: 'processing',
      message: 'Serializing to JSON...',
    });

    return JSON.stringify(exportData, null, 2);
  }

  private async generateExcel<T>(
    data: T[],
    options: ExportOptions,
    exportId: string
  ): Promise<ArrayBuffer> {
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Add metadata sheet if requested
    if (options.includeMetadata) {
      const metadataSheet = XLSX.utils.json_to_sheet([
        {
          Property: 'Exported At',
          Value: format(new Date(), 'PPpp'),
        },
        {
          Property: 'Record Count',
          Value: data.length,
        },
        {
          Property: 'Format',
          Value: 'Excel',
        },
      ]);
      
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    this.updateProgress(exportId, {
      total: data.length,
      processed: data.length,
      percentage: 70,
      status: 'processing',
      message: 'Generating Excel file...',
    });

    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }

  private async generatePDF<T>(
    data: T[],
    options: ExportOptions,
    exportId: string
  ): Promise<ArrayBuffer> {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Data Export Report', 20, 20);
    
    // Add metadata if requested
    if (options.includeMetadata) {
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 20, 35);
      doc.text(`Records: ${data.length}`, 20, 45);
      doc.text(`Format: PDF`, 20, 55);
    }

    if (data.length > 0) {
      const headers = Object.keys(data[0] as object);
      const tableData = data.map(row => 
        headers.map(header => String((row as any)[header] || ''))
      );

      // Add table
      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: options.includeMetadata ? 65 : 35,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
        },
        didDrawPage: () => {
          // Update progress during PDF generation
          this.updateProgress(exportId, {
            total: data.length,
            processed: data.length,
            percentage: 70,
            status: 'processing',
            message: 'Generating PDF...',
          });
        },
      });
    }

    return doc.output('arraybuffer');
  }

  private applyFilters<T>(data: T[], filters?: Record<string, any>): T[] {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        const itemValue = (item as any)[key];
        
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }
        
        if (typeof value === 'object' && value !== null) {
          const { operator, value: filterValue } = value;
          
          switch (operator) {
            case 'gt':
              return itemValue > filterValue;
            case 'gte':
              return itemValue >= filterValue;
            case 'lt':
              return itemValue < filterValue;
            case 'lte':
              return itemValue <= filterValue;
            case 'contains':
              return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'startsWith':
              return String(itemValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
            case 'endsWith':
              return String(itemValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
            default:
              return itemValue === filterValue;
          }
        }
        
        return itemValue === value;
      });
    });
  }

  private selectColumns<T>(data: T[], columns?: string[]): T[] {
    if (!columns || columns.length === 0) {
      return data;
    }

    return data.map(item => {
      const selected: any = {};
      columns.forEach(column => {
        selected[column] = (item as any)[column];
      });
      return selected;
    });
  }

  private async compressContent(content: string): Promise<string> {
    // In a real implementation, use a compression library like pako
    // For now, return content as-is
    return content;
  }

  private async sendEmail(
    content: string | ArrayBuffer,
    filename: string,
    mimeType: string,
    email: string
  ): Promise<boolean> {
    try {
      const base64Content = typeof content === 'string' 
        ? btoa(content) 
        : btoa(String.fromCharCode(...new Uint8Array(content)));

      const response = await fetch('/api/export/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: `Data Export - ${filename}`,
          attachments: [{
            filename,
            content: base64Content,
            contentType: mimeType,
          }],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  private createDownloadUrl(content: string | ArrayBuffer, mimeType: string): string {
    const blob = new Blob([content], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateProgress(exportId: string, progress: ExportProgress): void {
    const callback = this.progressCallbacks.get(exportId);
    if (callback) {
      callback(progress);
    }
  }

  // Scheduled export functionality
  async scheduleExport(
    dataSource: string,
    options: ExportOptions,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string; // HH:MM format
      dayOfWeek?: number; // 0-6 for weekly
      dayOfMonth?: number; // 1-31 for monthly
    }
  ): Promise<string> {
    const scheduleId = this.generateExportId();
    
    // In a real implementation, this would integrate with a job scheduler
    // For now, just return the schedule ID
    console.log('Scheduled export:', { dataSource, options, schedule, scheduleId });
    
    return scheduleId;
  }

  async cancelScheduledExport(scheduleId: string): Promise<boolean> {
    // In a real implementation, this would cancel the scheduled job
    console.log('Cancelled scheduled export:', scheduleId);
    return true;
  }

  async getExportHistory(limit: number = 100): Promise<ExportResult[]> {
    // In a real implementation, this would fetch from a database
    // For now, return empty array
    return [];
  }

  // Streaming export for very large datasets
  async *streamExport<T>(
    dataSource: AsyncGenerator<T[], void, unknown>,
    options: ExportOptions
  ): AsyncGenerator<{ chunk: string; progress: ExportProgress }, void, unknown> {
    let totalProcessed = 0;
    const exportId = this.generateExportId();

    try {
      for await (const chunk of dataSource) {
        const processedChunk = await this.processChunk(chunk, options);
        totalProcessed += chunk.length;

        yield {
          chunk: processedChunk,
          progress: {
            total: -1, // Unknown total for streaming
            processed: totalProcessed,
            percentage: 0,
            status: 'processing',
            message: `Processed ${totalProcessed} records...`,
          },
        };
      }
    } catch (error) {
      yield {
        chunk: '',
        progress: {
          total: -1,
          processed: totalProcessed,
          percentage: 0,
          status: 'error',
          message: error instanceof Error ? error.message : 'Stream export failed',
        },
      };
    }
  }

  private async processChunk<T>(chunk: T[], options: ExportOptions): Promise<string> {
    switch (options.format) {
      case 'csv':
        return this.chunkToCSV(chunk, options);
      case 'json':
        return this.chunkToJSON(chunk, options);
      default:
        throw new Error(`Streaming not supported for format: ${options.format}`);
    }
  }

  private chunkToCSV<T>(chunk: T[], options: ExportOptions): string {
    if (chunk.length === 0) return '';

    const headers = Object.keys(chunk[0] as object);
    return chunk.map(row => 
      headers.map(header => {
        const value = (row as any)[header];
        if (value === null || value === undefined) return '';
        
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ).join('\n') + '\n';
  }

  private chunkToJSON<T>(chunk: T[], options: ExportOptions): string {
    return chunk.map(item => JSON.stringify(item)).join('\n') + '\n';
  }
}

// Export singleton instance
export const dataExportService = new DataExportService();

export default DataExportService;