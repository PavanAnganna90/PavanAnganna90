/**
 * Test Automation Dashboard
 * 
 * Comprehensive dashboard for test automation management:
 * - Test suite overview and management
 * - Test run monitoring and analytics
 * - Real-time test execution tracking
 * - Test result visualization
 * - Coverage reports and trends
 * - Flakiness analysis
 * - Test scheduling and automation
 * - Performance and stability metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, ScatterChart, Scatter
} from 'recharts';
import { 
  testAutomationService, 
  TestSuite, 
  TestRun, 
  TestSchedule, 
  TestType,
  TestFramework,
  TestRunStatus 
} from '@/services/testAutomation';

interface TestAutomationDashboardProps {
  className?: string;
}

interface DashboardState {
  testSuites: TestSuite[];
  testRuns: TestRun[];
  activeRuns: TestRun[];
  testSchedules: TestSchedule[];
  analytics: any;
  selectedSuite: TestSuite | null;
  selectedRun: TestRun | null;
  selectedTab: string;
  timeRange: string;
  loading: boolean;
  error: string | null;
}

const TEST_TYPES: { value: TestType; label: string; color: string }[] = [
  { value: 'unit', label: 'Unit Tests', color: '#3B82F6' },
  { value: 'integration', label: 'Integration Tests', color: '#10B981' },
  { value: 'e2e', label: 'E2E Tests', color: '#F59E0B' },
  { value: 'performance', label: 'Performance Tests', color: '#EF4444' },
  { value: 'security', label: 'Security Tests', color: '#8B5CF6' },
  { value: 'api', label: 'API Tests', color: '#06B6D4' }
];

const FRAMEWORKS: { value: TestFramework; label: string }[] = [
  { value: 'jest', label: 'Jest' },
  { value: 'vitest', label: 'Vitest' },
  { value: 'cypress', label: 'Cypress' },
  { value: 'playwright', label: 'Playwright' },
  { value: 'selenium', label: 'Selenium' },
  { value: 'puppeteer', label: 'Puppeteer' }
];

const STATUS_COLORS = {
  pending: '#6B7280',
  running: '#3B82F6',
  completed: '#10B981',
  failed: '#EF4444',
  cancelled: '#8B5CF6',
  timeout: '#F59E0B'
};

export const TestAutomationDashboard: React.FC<TestAutomationDashboardProps> = ({
  className = "",
}) => {
  const [state, setState] = useState<DashboardState>({
    testSuites: [],
    testRuns: [],
    activeRuns: [],
    testSchedules: [],
    analytics: null,
    selectedSuite: null,
    selectedRun: null,
    selectedTab: 'overview',
    timeRange: '30d',
    loading: true,
    error: null,
  });

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [suites, runs, schedules, analytics] = await Promise.all([
        testAutomationService.listTestSuites(),
        testAutomationService.listTestRuns(),
        testAutomationService.listTestSchedules(),
        testAutomationService.getTestAnalytics(undefined, state.timeRange)
      ]);

      const activeRuns = runs.filter(run => run.status === 'running' || run.status === 'pending');

      setState(prev => ({
        ...prev,
        testSuites: suites,
        testRuns: runs,
        activeRuns,
        testSchedules: schedules,
        analytics,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data',
        loading: false,
      }));
    }
  }, [state.timeRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh active runs
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.activeRuns.length > 0) {
        loadDashboardData();
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [state.activeRuns.length, loadDashboardData]);

  // Handle test suite selection
  const handleSuiteSelect = useCallback((suite: TestSuite) => {
    setState(prev => ({ ...prev, selectedSuite: suite, selectedRun: null }));
  }, []);

  // Handle test run selection
  const handleRunSelect = useCallback((run: TestRun) => {
    setState(prev => ({ ...prev, selectedRun: run }));
  }, []);

  // Handle run test suite
  const handleRunTestSuite = useCallback(async (suiteId: string) => {
    try {
      await testAutomationService.runTestSuite(suiteId, 'manual');
      await loadDashboardData();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to run test suite'
      }));
    }
  }, [loadDashboardData]);

  // Handle cancel test run
  const handleCancelTestRun = useCallback(async (runId: string) => {
    try {
      await testAutomationService.cancelTestRun(runId);
      await loadDashboardData();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to cancel test run'
      }));
    }
  }, [loadDashboardData]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    setState(prev => ({ ...prev, timeRange }));
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setState(prev => ({ ...prev, selectedTab: tab }));
  }, []);

  // Get test type distribution
  const getTestTypeDistribution = useCallback(() => {
    const distribution = new Map<TestType, number>();
    
    state.testSuites.forEach(suite => {
      distribution.set(suite.type, (distribution.get(suite.type) || 0) + 1);
    });

    return Array.from(distribution.entries()).map(([type, count]) => {
      const typeInfo = TEST_TYPES.find(t => t.value === type);
      return {
        name: typeInfo?.label || type,
        value: count,
        color: typeInfo?.color || '#6B7280'
      };
    });
  }, [state.testSuites]);

  // Get recent test runs
  const getRecentTestRuns = useCallback(() => {
    return state.testRuns
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 20);
  }, [state.testRuns]);

  // Get pass rate trend
  const getPassRateTrend = useCallback(() => {
    if (!state.analytics?.trends) return [];
    
    return state.analytics.trends.map((trend: any) => ({
      date: format(new Date(trend.date), 'MMM dd'),
      passRate: trend.passRate,
      avgDuration: trend.avgDuration / 1000 // Convert to seconds
    }));
  }, [state.analytics]);

  // Get coverage trend
  const getCoverageTrend = useCallback(() => {
    if (!state.analytics?.coverageTrends) return [];
    
    return state.analytics.coverageTrends.map((trend: any) => ({
      date: format(new Date(trend.date), 'MMM dd'),
      statements: trend.statements,
      branches: trend.branches,
      functions: trend.functions,
      lines: trend.lines
    }));
  }, [state.analytics]);

  if (state.loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
          <p className="text-red-600 text-sm mt-1">{state.error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Test Automation
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive test automation management and analytics
          </p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={state.timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'suites', label: 'Test Suites' },
            { id: 'runs', label: 'Test Runs' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'schedules', label: 'Schedules' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                state.selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {state.selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Total Suites</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {state.testSuites.length}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Active Runs</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {state.activeRuns.length}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Success Rate</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {state.analytics ? `${state.analytics.successRate.toFixed(1)}%` : 'N/A'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Avg Duration</h3>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {state.analytics ? `${(state.analytics.averageDuration / 1000).toFixed(1)}s` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Active Runs */}
          {state.activeRuns.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Active Test Runs
              </h3>
              
              <div className="space-y-4">
                {state.activeRuns.map((run) => (
                  <div key={run.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: STATUS_COLORS[run.status] }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {state.testSuites.find(s => s.id === run.suiteId)?.name || 'Unknown Suite'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {run.environment}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {format(run.startTime, 'HH:mm:ss')}
                        </span>
                        <button
                          onClick={() => handleCancelTestRun(run.id)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Status: {run.status} | Tests: {run.results.length} | Duration: {
                        run.duration ? `${(run.duration / 1000).toFixed(1)}s` : 'Running...'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Type Distribution */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Test Type Distribution
              </h3>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getTestTypeDistribution()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getTestTypeDistribution().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pass Rate Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Pass Rate Trend
              </h3>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={getPassRateTrend()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="passRate" fill="#10B981" name="Pass Rate %" />
                    <Line yAxisId="right" type="monotone" dataKey="avgDuration" stroke="#3B82F6" name="Avg Duration (s)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Test Runs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Test Runs
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Suite
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Results
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {getRecentTestRuns().map((run) => (
                    <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {state.testSuites.find(s => s.id === run.suiteId)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          run.status === 'completed' ? 'bg-green-100 text-green-800' :
                          run.status === 'failed' ? 'bg-red-100 text-red-800' :
                          run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {run.summary.passed}/{run.summary.total} ({run.summary.passRate.toFixed(1)}%)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {format(run.startTime, 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <button
                          onClick={() => handleRunSelect(run)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Test Suites Tab */}
      {state.selectedTab === 'suites' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Test Suites
              </h3>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                Create Suite
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.testSuites.map((suite) => (
                <div key={suite.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{suite.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      suite.status === 'active' ? 'bg-green-100 text-green-800' :
                      suite.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {suite.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {suite.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="font-medium">{suite.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">Framework:</span>
                      <span className="font-medium">{suite.framework}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex space-x-2">
                    <button
                      onClick={() => handleRunTestSuite(suite.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Run Tests
                    </button>
                    <button
                      onClick={() => handleSuiteSelect(suite)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {state.selectedTab === 'analytics' && state.analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coverage Trends */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Coverage Trends
              </h3>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getCoverageTrend()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="statements" stroke="#3B82F6" name="Statements" />
                    <Line type="monotone" dataKey="branches" stroke="#10B981" name="Branches" />
                    <Line type="monotone" dataKey="functions" stroke="#F59E0B" name="Functions" />
                    <Line type="monotone" dataKey="lines" stroke="#EF4444" name="Lines" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Failing Tests */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Failing Tests
              </h3>
              
              <div className="space-y-3">
                {state.analytics.topFailingTests?.slice(0, 8).map((test: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {test.testName}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                        {test.failures} failures
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Metrics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {state.analytics.totalRuns}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Runs</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {state.analytics.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {(state.analytics.averageDuration / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {state.analytics.flakinessRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Flakiness Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Run Details Modal */}
      {state.selectedRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Test Run Details
                </h3>
                <button
                  onClick={() => setState(prev => ({ ...prev, selectedRun: null }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Run Information</h4>
                  <div className="space-y-1 text-sm">
                    <div>Status: <span className="font-medium">{state.selectedRun.status}</span></div>
                    <div>Environment: <span className="font-medium">{state.selectedRun.environment}</span></div>
                    <div>Trigger: <span className="font-medium">{state.selectedRun.trigger}</span></div>
                    <div>Duration: <span className="font-medium">{
                      state.selectedRun.duration ? `${(state.selectedRun.duration / 1000).toFixed(1)}s` : 'N/A'
                    }</span></div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Test Results</h4>
                  <div className="space-y-1 text-sm">
                    <div>Total: <span className="font-medium">{state.selectedRun.summary.total}</span></div>
                    <div>Passed: <span className="font-medium text-green-600">{state.selectedRun.summary.passed}</span></div>
                    <div>Failed: <span className="font-medium text-red-600">{state.selectedRun.summary.failed}</span></div>
                    <div>Pass Rate: <span className="font-medium">{state.selectedRun.summary.passRate.toFixed(1)}%</span></div>
                  </div>
                </div>
              </div>
              
              {/* Test Results */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Test Results</h4>
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Test Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {state.selectedRun.results.map((result, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                            {result.testName}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              result.status === 'passed' ? 'bg-green-100 text-green-800' :
                              result.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300">
                            {(result.duration / 1000).toFixed(2)}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Logs */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Logs</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                  {state.selectedRun.logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">[{format(log.timestamp, 'HH:mm:ss')}]</span>
                      <span className={`ml-2 ${
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'warn' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestAutomationDashboard;