/**
 * Dashboard Builder Page - Main entry point for custom dashboard creation
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import DashboardBuilder from '@/components/dashboard/DashboardBuilder';
import { 
  Plus, 
  Grid3X3, 
  Search, 
  Filter,
  Edit,
  Copy,
  Trash2,
  Eye,
  Calendar,
  User,
  BarChart3,
  Zap
} from 'lucide-react';

interface DashboardSummary {
  id: string;
  name: string;
  description: string;
  widgetCount: number;
  lastModified: string;
  createdBy: string;
  isTemplate: boolean;
  theme: string;
}

// Sample dashboard data for testing
const SAMPLE_DASHBOARDS: DashboardSummary[] = [
  {
    id: '1',
    name: 'Infrastructure Overview',
    description: 'High-level infrastructure health and performance metrics',
    widgetCount: 8,
    lastModified: '2024-01-15T10:30:00Z',
    createdBy: 'Admin User',
    isTemplate: true,
    theme: 'light'
  },
  {
    id: '2',
    name: 'Application Performance',
    description: 'Application performance monitoring and alerts',
    widgetCount: 6,
    lastModified: '2024-01-14T15:45:00Z',
    createdBy: 'Dev Team',
    isTemplate: false,
    theme: 'dark'
  },
  {
    id: '3',
    name: 'Security Dashboard',
    description: 'Security metrics and compliance monitoring',
    widgetCount: 10,
    lastModified: '2024-01-13T09:15:00Z',
    createdBy: 'Security Team',
    isTemplate: false,
    theme: 'light'
  }
];

const DashboardCard: React.FC<{
  dashboard: DashboardSummary;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}> = ({ dashboard, onEdit, onDuplicate, onDelete, onView }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {dashboard.name}
            </h3>
            {dashboard.isTemplate && (
              <Badge variant="secondary">Template</Badge>
            )}
          </div>
          <p className="text-gray-600 text-sm mb-3">
            {dashboard.description}
          </p>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(dashboard.id)}
            title="View Dashboard"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(dashboard.id)}
            title="Edit Dashboard"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(dashboard.id)}
            title="Duplicate Dashboard"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(dashboard.id)}
            title="Delete Dashboard"
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Grid3X3 className="h-3 w-3" />
            <span>{dashboard.widgetCount} widgets</span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{dashboard.createdBy}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(dashboard.lastModified)}</span>
        </div>
      </div>
    </Card>
  );
};

const DashboardBuilderPage: React.FC = () => {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>(SAMPLE_DASHBOARDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  const filteredDashboards = dashboards.filter(dashboard =>
    dashboard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dashboard.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    setEditingDashboard(null);
    setShowBuilder(true);
  };

  const handleEditDashboard = (id: string) => {
    setEditingDashboard(id);
    setShowBuilder(true);
  };

  const handleDuplicateDashboard = (id: string) => {
    const originalDashboard = dashboards.find(d => d.id === id);
    if (originalDashboard) {
      const newDashboard: DashboardSummary = {
        ...originalDashboard,
        id: `${Date.now()}`,
        name: `${originalDashboard.name} (Copy)`,
        lastModified: new Date().toISOString(),
        isTemplate: false
      };
      setDashboards([...dashboards, newDashboard]);
    }
  };

  const handleDeleteDashboard = (id: string) => {
    setDashboards(dashboards.filter(d => d.id !== id));
    setShowDeleteDialog(null);
  };

  const handleViewDashboard = (id: string) => {
    // In a real app, this would navigate to the dashboard view
    console.log('Viewing dashboard:', id);
  };

  if (showBuilder) {
    return (
      <div className="h-screen">
        <div className="border-b border-gray-200 p-4 bg-white">
          <Button
            variant="outline"
            onClick={() => setShowBuilder(false)}
            className="mb-2"
          >
            ← Back to Dashboards
          </Button>
        </div>
        <DashboardBuilder />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
                  Dashboard Builder
                </h1>
                <p className="text-gray-600 mt-1">
                  Create and manage custom dashboards with drag-and-drop functionality
                </p>
              </div>
              
              <Button onClick={handleCreateNew} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Create Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search dashboards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Quick Start Templates */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Start Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Infrastructure Overview',
                description: 'Monitor servers, databases, and network health',
                icon: '🏗️',
                widgets: 8
              },
              {
                name: 'Application Performance',
                description: 'Track response times, errors, and throughput',
                icon: '📱',
                widgets: 6
              },
              {
                name: 'Security Dashboard',
                description: 'Security events, compliance, and threat monitoring',
                icon: '🔒',
                widgets: 10
              }
            ].map((template, index) => (
              <Card 
                key={index}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-dashed border-2"
                onClick={handleCreateNew}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{template.icon}</div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {template.description}
                  </p>
                  <Badge variant="outline">
                    {template.widgets} widgets
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Existing Dashboards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Dashboards ({filteredDashboards.length})
            </h2>
          </div>
          
          {filteredDashboards.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No dashboards found' : 'No dashboards yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create your first dashboard to get started'
                }
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Dashboard
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredDashboards.map(dashboard => (
                <DashboardCard
                  key={dashboard.id}
                  dashboard={dashboard}
                  onEdit={handleEditDashboard}
                  onDuplicate={handleDuplicateDashboard}
                  onDelete={(id) => setShowDeleteDialog(id)}
                  onView={handleViewDashboard}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!showDeleteDialog} 
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dashboard</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete this dashboard? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => showDeleteDialog && handleDeleteDashboard(showDeleteDialog)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardBuilderPage;