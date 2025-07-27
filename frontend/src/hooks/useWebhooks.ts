/**
 * Webhook Management Hooks
 * React hooks for managing GitHub webhooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:3003/api';

interface WebhookConfig {
  url: string;
  events: string[];
  active: boolean;
  content_type: string;
  insecure_ssl: string;
}

interface WebhookInstructions {
  setup: string[];
  events: Record<string, string>;
}

interface WebhookConfigResponse {
  config: WebhookConfig;
  instructions: WebhookInstructions;
}

interface WebhookStats {
  totalEvents: number;
  eventTypes: Record<string, number>;
  lastProcessed?: Date;
}

interface WebhookValidation {
  endpointUrl: string;
  isAccessible: boolean;
  supportedEvents: string[];
  securityNotes: string[];
}

interface WebhookTestResult {
  testResult: {
    success: boolean;
    message: string;
  };
  testPayload: {
    event: string;
    processed: boolean;
  };
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data;
}

/**
 * Hook for webhook configuration
 */
export function useWebhookConfig() {
  return useQuery({
    queryKey: ['webhooks', 'config'],
    queryFn: () => makeAuthenticatedRequest<WebhookConfigResponse>('/webhooks/config'),
    staleTime: Infinity, // Config rarely changes
  });
}

/**
 * Hook for webhook statistics
 */
export function useWebhookStats() {
  return useQuery({
    queryKey: ['webhooks', 'stats'],
    queryFn: () => makeAuthenticatedRequest<WebhookStats>('/webhooks/stats'),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook for webhook validation
 */
export function useWebhookValidation() {
  return useQuery({
    queryKey: ['webhooks', 'validation'],
    queryFn: () => makeAuthenticatedRequest<WebhookValidation>('/webhooks/validate'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for testing webhooks
 */
export function useWebhookTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => makeAuthenticatedRequest<WebhookTestResult>('/webhooks/test', {
      method: 'POST',
    }),
    onSuccess: () => {
      // Refresh webhook stats after test
      queryClient.invalidateQueries({ queryKey: ['webhooks', 'stats'] });
    },
  });
}

/**
 * Combined hook for webhook management
 */
export function useWebhookManagement() {
  const configQuery = useWebhookConfig();
  const statsQuery = useWebhookStats();
  const validationQuery = useWebhookValidation();
  const testMutation = useWebhookTest();

  const isLoading = configQuery.isLoading || statsQuery.isLoading || validationQuery.isLoading;
  const hasError = configQuery.error || statsQuery.error || validationQuery.error;

  return {
    config: configQuery.data,
    stats: statsQuery.data,
    validation: validationQuery.data,
    isLoading,
    hasError,
    testWebhook: testMutation.mutate,
    isTesting: testMutation.isPending,
    testResult: testMutation.data,
    testError: testMutation.error,
    refetch: () => {
      configQuery.refetch();
      statsQuery.refetch();
      validationQuery.refetch();
    },
  };
}

/**
 * Hook for webhook setup guidance
 */
export function useWebhookSetup() {
  const { config, validation, isLoading } = useWebhookManagement();

  const setupSteps = config?.instructions.setup || [];
  const supportedEvents = validation?.supportedEvents || [];
  const webhookUrl = config?.config.url || '';

  const isSetupComplete = validation?.isAccessible || false;

  return {
    setupSteps,
    supportedEvents,
    webhookUrl,
    isSetupComplete,
    isLoading,
    eventDescriptions: config?.instructions.events || {},
    securityNotes: validation?.securityNotes || [],
  };
}

/**
 * Hook for webhook activity monitoring
 */
export function useWebhookActivity() {
  const statsQuery = useWebhookStats();

  const eventTypes = statsQuery.data?.eventTypes || {};
  const totalEvents = statsQuery.data?.totalEvents || 0;
  const lastProcessed = statsQuery.data?.lastProcessed;

  // Calculate event type percentages
  const eventTypeStats = Object.entries(eventTypes).map(([type, count]) => ({
    type,
    count,
    percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
  }));

  const isActive = totalEvents > 0;
  const hasRecentActivity = lastProcessed ? 
    new Date().getTime() - new Date(lastProcessed).getTime() < 24 * 60 * 60 * 1000 : false;

  return {
    totalEvents,
    eventTypeStats,
    lastProcessed,
    isActive,
    hasRecentActivity,
    isLoading: statsQuery.isLoading,
    error: statsQuery.error,
    refetch: statsQuery.refetch,
  };
}