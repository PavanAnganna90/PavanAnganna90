'use client';

import React, { useState } from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { Alert, AlertRule, SilenceRule, Incident } from '@/types/monitoring';
import { LineChart, DonutChart, BarChart } from '@/components/charts';

interface MonitoringPageState {
  activeTab: 'alerts' | 'rules' | 'silences' | 'incidents';
  selectedSeverity: 'all' | 'critical' | 'high' | 'medium' | 'low';
  selectedStatus: 'all' | 'active' | 'resolved' | 'acknowledged' | 'suppressed';
  searchQuery: string;
}

export default function MonitoringPage() {
  const { alertsData, loading, error, acknowledgeAlert, resolveAlert, createSilence } = useAlerts();
  const [state, setState] = useState<MonitoringPageState>({
    activeTab: 'alerts',
    selectedSeverity: 'all',
    selectedStatus: 'all',
    searchQuery: ''
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-kassow-dark">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kassow-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-kassow-dark p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getStatusColor = (status: Alert['status']) => {
    switch (status) {
      case 'active': return 'text-red-400 bg-red-500/10';
      case 'resolved': return 'text-emerald-400 bg-emerald-500/10';
      case 'acknowledged': return 'text-yellow-400 bg-yellow-500/10';
      case 'suppressed': return 'text-slate-400 bg-slate-500/10';
    }
  };

  const filteredAlerts = alertsData.alerts.filter(alert => {
    const severityMatch = state.selectedSeverity === 'all' || alert.severity === state.selectedSeverity;
    const statusMatch = state.selectedStatus === 'all' || alert.status === state.selectedStatus;
    const searchMatch = state.searchQuery === '' || 
      alert.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(state.searchQuery.toLowerCase());
    
    return severityMatch && statusMatch && searchMatch;
  });

  const AlertCard = ({ alert }: { alert: Alert }) => (
    <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4 hover:border-gray-600/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
              {alert.severity.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(alert.status)}`}>
              {alert.status.toUpperCase()}
            </span>
          </div>
          <h3 className="text-kassow-light font-semibold text-sm truncate">{alert.name}</h3>
          <p className="text-slate-400 text-xs mt-1">{alert.description}</p>
        </div>
        
        <div className="flex space-x-2 ml-4">
          {alert.status === 'active' && (
            <>
              <button
                onClick={() => acknowledgeAlert(alert.id)}
                className="px-3 py-1 bg-yellow-600 text-yellow-100 rounded text-xs hover:bg-yellow-500 transition-colors"
              >
                Acknowledge
              </button>
              <button
                onClick={() => resolveAlert(alert.id)}
                className="px-3 py-1 bg-emerald-600 text-emerald-100 rounded text-xs hover:bg-emerald-500 transition-colors"
              >
                Resolve
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate-400">Metric:</span>
          <span className="text-kassow-light ml-2">{alert.metric}</span>
        </div>
        <div>
          <span className="text-slate-400">Service:</span>
          <span className="text-kassow-light ml-2">{alert.labels.service}</span>
        </div>
        <div>
          <span className="text-slate-400">Environment:</span>
          <span className="text-kassow-light ml-2">{alert.labels.environment}</span>
        </div>
        <div>
          <span className="text-slate-400">Started:</span>
          <span className="text-kassow-light ml-2">
            {new Date(alert.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );

  const AlertsTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-kassow-light">{alertsData.summary.total}</div>
          <div className="text-slate-400 text-sm">Total Alerts</div>
        </div>
        <div className="bg-kassow-darker/50 backdrop-blur border border-red-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{alertsData.summary.critical}</div>
          <div className="text-slate-400 text-sm">Critical</div>
        </div>
        <div className="bg-kassow-darker/50 backdrop-blur border border-orange-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-400">{alertsData.summary.high}</div>
          <div className="text-slate-400 text-sm">High</div>
        </div>
        <div className="bg-kassow-darker/50 backdrop-blur border border-yellow-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{alertsData.summary.medium}</div>
          <div className="text-slate-400 text-sm">Medium</div>
        </div>
        <div className="bg-kassow-darker/50 backdrop-blur border border-emerald-500/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-emerald-400">{alertsData.summary.resolved}</div>
          <div className="text-slate-400 text-sm">Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Search</label>
            <input
              type="text"
              value={state.searchQuery}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search alerts..."
              className="w-full px-3 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Severity</label>
            <select
              value={state.selectedSeverity}
              onChange={(e) => setState(prev => ({ ...prev, selectedSeverity: e.target.value as any }))}
              className="w-full px-3 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Status</label>
            <select
              value={state.selectedStatus}
              onChange={(e) => setState(prev => ({ ...prev, selectedStatus: e.target.value as any }))}
              className="w-full px-3 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
              <option value="suppressed">Suppressed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setState(prev => ({ ...prev, searchQuery: '', selectedSeverity: 'all', selectedStatus: 'all' }))}
              className="px-4 py-2 bg-slate-600 text-slate-300 rounded text-sm hover:bg-slate-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-8 text-center">
            <div className="text-slate-400 mb-2">No alerts match your filters</div>
            <button
              onClick={() => setState(prev => ({ ...prev, searchQuery: '', selectedSeverity: 'all', selectedStatus: 'all' }))}
              className="text-kassow-accent hover:text-kassow-accent-hover transition-colors"
            >
              Clear filters to see all alerts
            </button>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>
    </div>
  );

  const RulesTab = () => (
    <div className="space-y-4">
      {alertsData.rules.map(rule => (
        <div key={rule.id} className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                  {rule.severity.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${rule.enabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-500/10'}`}>
                  {rule.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <h3 className="text-kassow-light font-semibold">{rule.name}</h3>
              <p className="text-slate-400 text-sm mt-1">{rule.description}</p>
            </div>
            <div className="text-xs text-slate-400">
              Last eval: {rule.lastEvaluation?.status || 'Unknown'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Metric:</span>
              <span className="text-kassow-light ml-2">{rule.metric}</span>
            </div>
            <div>
              <span className="text-slate-400">Condition:</span>
              <span className="text-kassow-light ml-2">{rule.condition.operator} {rule.condition.value}</span>
            </div>
            <div>
              <span className="text-slate-400">For:</span>
              <span className="text-kassow-light ml-2">{rule.for}</span>
            </div>
            <div>
              <span className="text-slate-400">Interval:</span>
              <span className="text-kassow-light ml-2">{rule.evaluationInterval}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const IncidentsTab = () => (
    <div className="space-y-4">
      {alertsData.incidents.map(incident => (
        <div key={incident.id} className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                  {incident.severity.toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${incident.status === 'resolved' ? 'text-emerald-400 bg-emerald-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                  {incident.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-kassow-light font-semibold">{incident.title}</h3>
              <p className="text-slate-400 text-sm mt-1">{incident.description}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Affected Services:</span>
              <div className="mt-1">
                {incident.affectedServices.map(service => (
                  <span key={service} className="inline-block px-2 py-1 bg-slate-600 text-slate-300 rounded mr-2 mb-1">
                    {service}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Assignees:</span>
              <div className="mt-1">
                {incident.assignees.map(assignee => (
                  <span key={assignee} className="inline-block px-2 py-1 bg-blue-600 text-blue-100 rounded mr-2 mb-1">
                    {assignee.split('@')[0]}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Created:</span>
              <span className="text-kassow-light ml-2">
                {new Date(incident.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-kassow-dark">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-kassow-light mb-2">Monitoring & Alerts</h1>
          <p className="text-slate-400">Monitor system health and manage alerts</p>
        </div>

        {/* Tabs */}
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg mb-6">
          <div className="flex border-b border-gray-700/50">
            {[
              { key: 'alerts', label: 'Alerts', count: alertsData.alerts.length },
              { key: 'rules', label: 'Rules', count: alertsData.rules.length },
              { key: 'silences', label: 'Silences', count: alertsData.silences.length },
              { key: 'incidents', label: 'Incidents', count: alertsData.incidents.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setState(prev => ({ ...prev, activeTab: tab.key as any }))}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  state.activeTab === tab.key
                    ? 'text-kassow-accent border-b-2 border-kassow-accent'
                    : 'text-slate-400 hover:text-kassow-light'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {state.activeTab === 'alerts' && <AlertsTab />}
          {state.activeTab === 'rules' && <RulesTab />}
          {state.activeTab === 'incidents' && <IncidentsTab />}
          {state.activeTab === 'silences' && (
            <div className="space-y-4">
              {alertsData.silences.map(silence => (
                <div key={silence.id} className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-kassow-light font-semibold">{silence.comment}</h3>
                      <p className="text-slate-400 text-sm mt-1">Created by {silence.createdBy}</p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                      {silence.status.state.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Starts:</span>
                      <span className="text-kassow-light ml-2">
                        {new Date(silence.startsAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Ends:</span>
                      <span className="text-kassow-light ml-2">
                        {new Date(silence.endsAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}