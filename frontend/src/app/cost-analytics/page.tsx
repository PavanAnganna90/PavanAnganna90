'use client';

import React, { useState, useMemo } from 'react';
import { useCostAnalytics } from '@/hooks/useCostAnalytics';
import { CostBreakdown, OptimizationRecommendation, BudgetAlert } from '@/types/cost';
import { LineChart, DonutChart, BarChart, AreaChart } from '@/components/charts';

interface CostAnalyticsState {
  activeTab: 'overview' | 'breakdown' | 'forecast' | 'optimization' | 'budgets';
  selectedCategory: string | null;
  selectedEnvironment: string | null;
  optimizationFilter: 'all' | 'pending' | 'in_progress' | 'completed' | 'dismissed';
}

export default function CostAnalyticsPage() {
  const { 
    costData, 
    loading, 
    error, 
    selectedTimeRange, 
    setSelectedTimeRange,
    implementOptimization,
    dismissOptimization,
    acknowledgeAlert,
    updateBudget 
  } = useCostAnalytics();
  
  const [state, setState] = useState<CostAnalyticsState>({
    activeTab: 'overview',
    selectedCategory: null,
    selectedEnvironment: null,
    optimizationFilter: 'all'
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!costData) return null;

    // Historical spending chart data
    const timeRangeMap = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const days = timeRangeMap[selectedTimeRange];
    const historicalData = costData.historical.slice(-days);

    const spendingTrend = historicalData.map(item => ({
      date: item.date,
      value: item.total
    }));

    // Category breakdown for donut chart
    const categoryBreakdown = costData.current.breakdown.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryBreakdown).map(([category, amount]) => ({
      name: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: amount,
      color: getCategoryColor(category)
    }));

    // Environment breakdown
    const environmentBreakdown = costData.current.breakdown.reduce((acc, item) => {
      acc[item.environment] = (acc[item.environment] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    const environmentData = Object.entries(environmentBreakdown).map(([env, amount]) => ({
      name: env.replace(/\b\w/g, l => l.toUpperCase()),
      value: amount
    }));

    // Monthly forecast data
    const forecastData = [
      { name: 'Current', value: costData.current.total, type: 'actual' },
      { name: 'Next Month', value: costData.forecast.nextMonth, type: 'forecast' },
      { name: 'Next Quarter', value: costData.forecast.nextQuarter / 3, type: 'forecast' },
    ];

    return {
      spendingTrend,
      categoryData,
      environmentData,
      forecastData
    };
  }, [costData, selectedTimeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-kassow-dark">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kassow-accent"></div>
        </div>
      </div>
    );
  }

  if (error || !costData) {
    return (
      <div className="min-h-screen bg-kassow-dark p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400">{error || 'Failed to load cost data'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      compute: '#3b82f6',
      storage: '#10b981',
      networking: '#f59e0b',
      database: '#8b5cf6',
      monitoring: '#06b6d4',
      security: '#ef4444',
      other: '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
    }
  };

  const filteredOptimizations = costData.optimization.filter(opt => {
    if (state.optimizationFilter === 'all') return true;
    return opt.status === state.optimizationFilter;
  });

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Current Spend</h3>
            <div className="flex items-center space-x-1">
              {getTrendIcon(costData.current.trend)}
              <span className={`text-sm font-medium ${
                costData.current.trend === 'up' ? 'text-red-400' : 
                costData.current.trend === 'down' ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {Math.abs(costData.current.percentageChange).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold text-kassow-light">
            ${costData.current.total.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">This month</div>
        </div>

        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Forecast</h3>
          <div className="text-2xl font-bold text-kassow-light">
            ${costData.forecast.nextMonth.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Next month ({costData.forecast.confidence}% confidence)
          </div>
        </div>

        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Budget Remaining</h3>
          <div className="text-2xl font-bold text-kassow-light">
            ${costData.budget.remaining.monthly.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {((costData.budget.remaining.monthly / costData.budget.monthly) * 100).toFixed(1)}% of monthly budget
          </div>
        </div>

        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-slate-400 text-sm font-medium mb-2">Potential Savings</h3>
          <div className="text-2xl font-bold text-emerald-400">
            ${costData.optimization.reduce((sum, opt) => sum + (opt.status === 'pending' ? opt.impact.monthly : 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {costData.optimization.filter(opt => opt.status === 'pending').length} recommendations
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trend */}
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-kassow-light font-semibold">Spending Trend</h3>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-1 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
          {chartData && (
            <AreaChart
              data={chartData.spendingTrend}
              height={200}
              color="#3b82f6"
              gradient={true}
            />
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-kassow-light font-semibold mb-4">Category Breakdown</h3>
          {chartData && (
            <DonutChart
              data={chartData.categoryData}
              size={200}
              showLegend={true}
            />
          )}
        </div>
      </div>

      {/* Budget Alerts */}
      {costData.budget.alerts.length > 0 && (
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-kassow-light font-semibold mb-4">Budget Alerts</h3>
          <div className="space-y-3">
            {costData.budget.alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'critical'
                          ? 'bg-red-500 text-white'
                          : alert.severity === 'warning'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-kassow-light font-medium">{alert.title}</span>
                    </div>
                    <p className="text-slate-400 text-sm">{alert.description}</p>
                    <div className="mt-2 text-xs text-slate-400">
                      Current: ${alert.current.toLocaleString()} / Threshold: ${alert.threshold.toLocaleString()} ({alert.percentage}%)
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1 bg-slate-600 text-slate-300 rounded text-sm hover:bg-slate-500 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const BreakdownTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Category</label>
            <select
              value={state.selectedCategory || 'all'}
              onChange={(e) => setState(prev => ({ ...prev, selectedCategory: e.target.value === 'all' ? null : e.target.value }))}
              className="w-full px-3 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="compute">Compute</option>
              <option value="storage">Storage</option>
              <option value="networking">Networking</option>
              <option value="database">Database</option>
              <option value="monitoring">Monitoring</option>
              <option value="security">Security</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Environment</label>
            <select
              value={state.selectedEnvironment || 'all'}
              onChange={(e) => setState(prev => ({ ...prev, selectedEnvironment: e.target.value === 'all' ? null : e.target.value }))}
              className="w-full px-3 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
            >
              <option value="all">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
              <option value="testing">Testing</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setState(prev => ({ ...prev, selectedCategory: null, selectedEnvironment: null }))}
              className="px-4 py-2 bg-slate-600 text-slate-300 rounded text-sm hover:bg-slate-500 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700/50">
          <h3 className="text-kassow-light font-semibold">Detailed Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Environment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Trend</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {costData.current.breakdown
                .filter(item => {
                  if (state.selectedCategory && item.category !== state.selectedCategory) return false;
                  if (state.selectedEnvironment && item.environment !== state.selectedEnvironment) return false;
                  return true;
                })
                .sort((a, b) => b.amount - a.amount)
                .map((item, index) => (
                  <tr key={index} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-kassow-light font-medium">{item.service}</div>
                      <div className="text-slate-400 text-xs">{item.region}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300">
                        {item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600 text-blue-100">
                        {item.environment.replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-kassow-light font-medium">${item.amount.toLocaleString()}</div>
                      <div className="text-slate-400 text-xs">{item.percentage.toFixed(1)}% of total</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(item.trend)}
                        <span className={`text-sm font-medium ${
                          item.trend === 'up' ? 'text-red-400' : 
                          item.trend === 'down' ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {Math.abs(item.percentageChange).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-kassow-light text-sm">{item.usage.current.toFixed(0)} {item.usage.unit}</div>
                      <div className="text-slate-400 text-xs">
                        {item.usage.current > item.usage.previous ? '+' : ''}
                        {((item.usage.current - item.usage.previous) / item.usage.previous * 100).toFixed(1)}% vs prev
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const OptimizationTab = () => (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <label className="text-slate-400 text-sm">Filter by status:</label>
          <select
            value={state.optimizationFilter}
            onChange={(e) => setState(prev => ({ ...prev, optimizationFilter: e.target.value as any }))}
            className="px-3 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light text-sm focus:border-kassow-accent focus:outline-none"
          >
            <option value="all">All Recommendations</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Optimization Cards */}
      <div className="space-y-4">
        {filteredOptimizations.map(optimization => (
          <div key={optimization.id} className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    optimization.status === 'pending' ? 'bg-yellow-600 text-yellow-100' :
                    optimization.status === 'in_progress' ? 'bg-blue-600 text-blue-100' :
                    optimization.status === 'completed' ? 'bg-emerald-600 text-emerald-100' :
                    'bg-slate-600 text-slate-300'
                  }`}>
                    {optimization.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300">
                    {optimization.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    optimization.priority >= 8 ? 'bg-red-600 text-red-100' :
                    optimization.priority >= 6 ? 'bg-orange-600 text-orange-100' :
                    'bg-green-600 text-green-100'
                  }`}>
                    P{optimization.priority}
                  </span>
                </div>
                <h3 className="text-kassow-light font-semibold text-lg">{optimization.title}</h3>
                <p className="text-slate-400 mt-1">{optimization.description}</p>
              </div>
              <div className="text-right ml-6">
                <div className="text-2xl font-bold text-emerald-400">
                  ${optimization.impact.monthly.toLocaleString()}
                </div>
                <div className="text-slate-400 text-sm">monthly savings</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div>
                <span className="text-slate-400">Service:</span>
                <span className="text-kassow-light ml-2">{optimization.service}</span>
              </div>
              <div>
                <span className="text-slate-400">Effort:</span>
                <span className="text-kassow-light ml-2">{optimization.effort.replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              <div>
                <span className="text-slate-400">Risk:</span>
                <span className="text-kassow-light ml-2">{optimization.risk.replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              <div>
                <span className="text-slate-400">Yearly Impact:</span>
                <span className="text-kassow-light ml-2">${optimization.impact.yearly.toLocaleString()}</span>
              </div>
            </div>

            {optimization.status === 'pending' && (
              <div className="flex space-x-3">
                <button
                  onClick={() => implementOptimization(optimization.id)}
                  className="px-4 py-2 bg-kassow-accent text-white font-medium rounded hover:bg-kassow-accent-hover transition-colors"
                >
                  Implement
                </button>
                <button
                  onClick={() => dismissOptimization(optimization.id)}
                  className="px-4 py-2 bg-slate-600 text-slate-300 rounded hover:bg-slate-500 transition-colors"
                >
                  Dismiss
                </button>
                <button className="px-4 py-2 border border-gray-600 text-slate-300 rounded hover:bg-slate-700 transition-colors">
                  View Details
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-kassow-dark">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-kassow-light mb-2">Cost Analytics</h1>
          <p className="text-slate-400">Monitor, analyze, and optimize your cloud spending</p>
        </div>

        {/* Tabs */}
        <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg mb-6">
          <div className="flex border-b border-gray-700/50 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: '=Ê' },
              { key: 'breakdown', label: 'Breakdown', icon: '=Ë' },
              { key: 'forecast', label: 'Forecast', icon: '=È' },
              { key: 'optimization', label: 'Optimization', icon: '¡' },
              { key: 'budgets', label: 'Budgets', icon: '=°' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setState(prev => ({ ...prev, activeTab: tab.key as any }))}
                className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
                  state.activeTab === tab.key
                    ? 'text-kassow-accent border-b-2 border-kassow-accent'
                    : 'text-slate-400 hover:text-kassow-light'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {state.activeTab === 'overview' && <OverviewTab />}
          {state.activeTab === 'breakdown' && <BreakdownTab />}
          {state.activeTab === 'optimization' && <OptimizationTab />}
          {state.activeTab === 'forecast' && (
            <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-8 text-center">
              <div className="text-slate-400 mb-4">=È</div>
              <h3 className="text-kassow-light font-semibold mb-2">Forecast Dashboard</h3>
              <p className="text-slate-400">Advanced forecasting features coming soon</p>
            </div>
          )}
          {state.activeTab === 'budgets' && (
            <div className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-8 text-center">
              <div className="text-slate-400 mb-4">=°</div>
              <h3 className="text-kassow-light font-semibold mb-2">Budget Management</h3>
              <p className="text-slate-400">Budget configuration and tracking features coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}