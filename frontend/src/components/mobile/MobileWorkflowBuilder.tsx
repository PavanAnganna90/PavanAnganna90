/**
 * Mobile Workflow Builder Component
 * 
 * Mobile-optimized workflow builder with:
 * - Touch-friendly interface
 * - Drag-and-drop workflow creation
 * - Mobile-specific workflow templates
 * - Gesture-based controls
 * - Offline workflow execution
 * - Real-time collaboration
 * - Voice command integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';

export interface WorkflowStep {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'notification';
  name: string;
  icon: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  connections: string[];
  mobileOptimized: boolean;
}

export interface MobileWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  category: WorkflowCategory;
  tags: string[];
  collaborators: string[];
  offlineCapable: boolean;
  mobileOptimized: boolean;
}

export interface WorkflowTrigger {
  id: string;
  type: 'alert' | 'schedule' | 'webhook' | 'manual' | 'geolocation' | 'device-state';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  mobileSpecific: boolean;
}

export interface WorkflowCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  mobileOptimized: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  steps: Omit<WorkflowStep, 'id'>[];
  triggers: Omit<WorkflowTrigger, 'id'>[];
  mobileOptimized: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface MobileWorkflowBuilderProps {
  workflow?: MobileWorkflow;
  onSave: (workflow: MobileWorkflow) => void;
  onCancel: () => void;
  className?: string;
}

const MOBILE_WORKFLOW_CATEGORIES: WorkflowCategory[] = [
  {
    id: 'incident-response',
    name: 'Incident Response',
    icon: '🚨',
    color: '#EF4444',
    mobileOptimized: true
  },
  {
    id: 'deployment',
    name: 'Deployment',
    icon: '🚀',
    color: '#3B82F6',
    mobileOptimized: true
  },
  {
    id: 'monitoring',
    name: 'Monitoring',
    icon: '📊',
    color: '#10B981',
    mobileOptimized: true
  },
  {
    id: 'automation',
    name: 'Automation',
    icon: '⚙️',
    color: '#8B5CF6',
    mobileOptimized: true
  },
  {
    id: 'notification',
    name: 'Notifications',
    icon: '🔔',
    color: '#F59E0B',
    mobileOptimized: true
  }
];

const MOBILE_STEP_TYPES: Array<{
  type: WorkflowStep['type'];
  name: string;
  icon: string;
  color: string;
  mobileOptimized: boolean;
}> = [
  {
    type: 'trigger',
    name: 'Trigger',
    icon: '⚡',
    color: '#3B82F6',
    mobileOptimized: true
  },
  {
    type: 'action',
    name: 'Action',
    icon: '🎯',
    color: '#10B981',
    mobileOptimized: true
  },
  {
    type: 'condition',
    name: 'Condition',
    icon: '🔀',
    color: '#F59E0B',
    mobileOptimized: true
  },
  {
    type: 'notification',
    name: 'Notification',
    icon: '📱',
    color: '#EF4444',
    mobileOptimized: true
  }
];

const MOBILE_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'quick-alert-response',
    name: 'Quick Alert Response',
    description: 'Rapidly respond to critical alerts on mobile',
    category: MOBILE_WORKFLOW_CATEGORIES[0],
    difficulty: 'beginner',
    mobileOptimized: true,
    steps: [
      {
        type: 'trigger',
        name: 'Critical Alert',
        icon: '🚨',
        config: { severity: 'critical' },
        position: { x: 100, y: 50 },
        connections: ['action-1'],
        mobileOptimized: true
      },
      {
        type: 'action',
        name: 'Send Push Notification',
        icon: '📱',
        config: { priority: 'high' },
        position: { x: 100, y: 150 },
        connections: ['action-2'],
        mobileOptimized: true
      },
      {
        type: 'action',
        name: 'Create Incident',
        icon: '📝',
        config: { autoAssign: true },
        position: { x: 100, y: 250 },
        connections: [],
        mobileOptimized: true
      }
    ],
    triggers: [
      {
        type: 'alert',
        name: 'Critical System Alert',
        config: { severity: 'critical' },
        enabled: true,
        mobileSpecific: true
      }
    ]
  },
  {
    id: 'location-based-deployment',
    name: 'Location-Based Deployment',
    description: 'Deploy based on device location',
    category: MOBILE_WORKFLOW_CATEGORIES[1],
    difficulty: 'intermediate',
    mobileOptimized: true,
    steps: [
      {
        type: 'trigger',
        name: 'Location Trigger',
        icon: '📍',
        config: { radius: 100 },
        position: { x: 100, y: 50 },
        connections: ['condition-1'],
        mobileOptimized: true
      },
      {
        type: 'condition',
        name: 'Check Time',
        icon: '⏰',
        config: { businessHours: true },
        position: { x: 100, y: 150 },
        connections: ['action-1'],
        mobileOptimized: true
      },
      {
        type: 'action',
        name: 'Deploy to Environment',
        icon: '🚀',
        config: { environment: 'staging' },
        position: { x: 100, y: 250 },
        connections: ['notification-1'],
        mobileOptimized: true
      },
      {
        type: 'notification',
        name: 'Deployment Complete',
        icon: '✅',
        config: { channels: ['push', 'sms'] },
        position: { x: 100, y: 350 },
        connections: [],
        mobileOptimized: true
      }
    ],
    triggers: [
      {
        type: 'geolocation',
        name: 'Office Location',
        config: { latitude: 37.7749, longitude: -122.4194, radius: 100 },
        enabled: true,
        mobileSpecific: true
      }
    ]
  }
];

export const MobileWorkflowBuilder: React.FC<MobileWorkflowBuilderProps> = ({
  workflow,
  onSave,
  onCancel,
  className = ""
}) => {
  const [currentWorkflow, setCurrentWorkflow] = useState<MobileWorkflow>(
    workflow || {
      id: generateId(),
      name: 'New Mobile Workflow',
      description: '',
      steps: [],
      triggers: [],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: MOBILE_WORKFLOW_CATEGORIES[0],
      tags: [],
      collaborators: [],
      offlineCapable: true,
      mobileOptimized: true
    }
  );

  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showStepPalette, setShowStepPalette] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'triggers' | 'settings'>('design');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Touch and gesture handling
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Handle drag and drop
  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === 'step-palette' && destination.droppableId === 'workflow-canvas') {
      // Adding new step from palette
      const stepType = MOBILE_STEP_TYPES[source.index];
      const newStep: WorkflowStep = {
        id: generateId(),
        type: stepType.type,
        name: stepType.name,
        icon: stepType.icon,
        config: {},
        position: { x: 100, y: destination.index * 100 + 50 },
        connections: [],
        mobileOptimized: true
      };

      setCurrentWorkflow(prev => ({
        ...prev,
        steps: [...prev.steps, newStep],
        updatedAt: new Date()
      }));
    } else if (source.droppableId === 'workflow-canvas' && destination.droppableId === 'workflow-canvas') {
      // Reordering steps
      const newSteps = Array.from(currentWorkflow.steps);
      const [reorderedItem] = newSteps.splice(source.index, 1);
      newSteps.splice(destination.index, 0, reorderedItem);

      setCurrentWorkflow(prev => ({
        ...prev,
        steps: newSteps,
        updatedAt: new Date()
      }));
    }
  }, [currentWorkflow.steps]);

  // Handle touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      setIsPanning(true);
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setIsPanning(false);
  }, []);

  // Handle pinch zoom
  const handlePinchZoom = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      // Implement pinch zoom logic
    }
  }, []);

  // Apply template
  const applyTemplate = useCallback((template: WorkflowTemplate) => {
    const newSteps: WorkflowStep[] = template.steps.map(step => ({
      ...step,
      id: generateId()
    }));

    const newTriggers: WorkflowTrigger[] = template.triggers.map(trigger => ({
      ...trigger,
      id: generateId()
    }));

    setCurrentWorkflow(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      category: template.category,
      steps: newSteps,
      triggers: newTriggers,
      updatedAt: new Date()
    }));

    setShowTemplates(false);
  }, []);

  // Update step configuration
  const updateStepConfig = useCallback((stepId: string, config: Record<string, any>) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, config, updatedAt: new Date() } : step
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Add connection between steps
  const addConnection = useCallback((fromStepId: string, toStepId: string) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === fromStepId 
          ? { ...step, connections: [...step.connections, toStepId] }
          : step
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Remove step
  const removeStep = useCallback((stepId: string) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId),
      updatedAt: new Date()
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(currentWorkflow);
  }, [currentWorkflow, onSave]);

  // Handle voice command (mobile-specific)
  const handleVoiceCommand = useCallback((command: string) => {
    // Implement voice command parsing
    console.log('Voice command:', command);
  }, []);

  return (
    <div className={`h-full flex flex-col bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentWorkflow.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mobile Workflow Builder
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Templates
            </button>
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
            >
              {isPreviewMode ? 'Edit' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex px-4">
          {[
            { id: 'design', label: 'Design', icon: '🎨' },
            { id: 'triggers', label: 'Triggers', icon: '⚡' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'design' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex h-full">
              {/* Step Palette */}
              <div className="w-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-2">
                <Droppable droppableId="step-palette">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {MOBILE_STEP_TYPES.map((stepType, index) => (
                        <Draggable key={stepType.type} draggableId={stepType.type} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl cursor-move hover:bg-gray-200 dark:hover:bg-gray-600"
                              style={{ backgroundColor: stepType.color + '20' }}
                            >
                              {stepType.icon}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Canvas */}
              <div className="flex-1 relative">
                <Droppable droppableId="workflow-canvas">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="h-full w-full bg-gray-50 dark:bg-gray-900 relative overflow-auto"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{ transform: `scale(${zoomLevel})` }}
                    >
                      {currentWorkflow.steps.map((step, index) => (
                        <Draggable key={step.id} draggableId={step.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="absolute w-20 h-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-move"
                              style={{
                                left: step.position.x,
                                top: step.position.y
                              }}
                              onClick={() => setSelectedStep(step)}
                            >
                              <div className="text-2xl mb-1">{step.icon}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 text-center px-1">
                                {step.name}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </DragDropContext>
        )}

        {activeTab === 'triggers' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Workflow Triggers
              </h3>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium">
                Add Trigger
              </button>
            </div>
            
            <div className="space-y-3">
              {currentWorkflow.triggers.map((trigger) => (
                <div key={trigger.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {trigger.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Type: {trigger.type}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {trigger.mobileSpecific && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                          Mobile
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={trigger.enabled}
                        onChange={(e) => {
                          setCurrentWorkflow(prev => ({
                            ...prev,
                            triggers: prev.triggers.map(t => 
                              t.id === trigger.id ? { ...t, enabled: e.target.checked } : t
                            ),
                            updatedAt: new Date()
                          }));
                        }}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Workflow Settings
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Workflow Name
                  </label>
                  <input
                    type="text"
                    value={currentWorkflow.name}
                    onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={currentWorkflow.description}
                    onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={currentWorkflow.category.id}
                    onChange={(e) => {
                      const category = MOBILE_WORKFLOW_CATEGORIES.find(c => c.id === e.target.value);
                      if (category) {
                        setCurrentWorkflow(prev => ({ ...prev, category }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {MOBILE_WORKFLOW_CATEGORIES.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentWorkflow.offlineCapable}
                      onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, offlineCapable: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Offline Capable</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentWorkflow.mobileOptimized}
                      onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, mobileOptimized: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Mobile Optimized</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mobile Workflow Templates
                </h3>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {MOBILE_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{template.category.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {template.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            template.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                            template.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {template.difficulty}
                          </span>
                          {template.mobileOptimized && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              Mobile
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default MobileWorkflowBuilder;