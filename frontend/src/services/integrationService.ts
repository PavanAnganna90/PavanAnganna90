/**
 * Integration Service
 * 
 * Third-party integrations management system:
 * - Slack integration (messages, channels, bots)
 * - Microsoft Teams integration
 * - Discord integration
 * - Email providers (SendGrid, Mailgun, etc.)
 * - Monitoring tools (PagerDuty, Opsgenie)
 * - CI/CD platforms (GitHub Actions, Jenkins)
 * - Cloud providers (AWS, Azure, GCP)
 * - Issue trackers (Jira, Linear, GitHub Issues)
 */

import { format } from 'date-fns';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  config: IntegrationConfig;
  credentials: IntegrationCredentials;
  enabled: boolean;
  status: IntegrationStatus;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  owner: string;
  permissions: string[];
  metadata: Record<string, any>;
}

export interface IntegrationType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: IntegrationCategory;
  features: string[];
  requiredPermissions: string[];
  supportedActions: IntegrationAction[];
}

export interface IntegrationProvider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  authMethod: 'oauth' | 'token' | 'basic' | 'custom';
  documentationUrl: string;
  supportsWebhooks: boolean;
  rateLimits: RateLimit[];
}

export interface IntegrationConfig {
  channels?: string[];
  defaultChannel?: string;
  mentionUsers?: boolean;
  includeMetadata?: boolean;
  formatMessages?: boolean;
  customFields?: Record<string, any>;
  filters?: IntegrationFilter[];
  templates?: MessageTemplate[];
}

export interface IntegrationCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
  expiresAt?: Date;
  scope?: string[];
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  parameters: ActionParameter[];
  responseFormat: 'json' | 'xml' | 'text';
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface IntegrationFilter {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'in';
  value: any;
  enabled: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  eventType: string;
  template: string;
  variables: string[];
  enabled: boolean;
}

export interface RateLimit {
  period: 'second' | 'minute' | 'hour' | 'day';
  limit: number;
  burst?: number;
}

export interface IntegrationUsage {
  integrationId: string;
  timestamp: Date;
  action: string;
  success: boolean;
  responseTime: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface IntegrationStats {
  totalIntegrations: number;
  activeIntegrations: number;
  totalUsage: number;
  successRate: number;
  averageResponseTime: number;
  topIntegrations: Array<{ integration: string; usage: number }>;
  recentUsage: IntegrationUsage[];
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type IntegrationCategory = 'communication' | 'monitoring' | 'deployment' | 'issue-tracking' | 'cloud' | 'security';

// Predefined integration types
const INTEGRATION_TYPES: IntegrationType[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages and notifications to Slack channels',
    icon: '💬',
    category: 'communication',
    features: ['Send messages', 'Create channels', 'Manage users', 'File uploads'],
    requiredPermissions: ['chat:write', 'channels:read', 'users:read'],
    supportedActions: [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a channel',
        method: 'POST',
        endpoint: '/chat.postMessage',
        parameters: [
          { name: 'channel', type: 'string', required: true, description: 'Channel ID or name' },
          { name: 'text', type: 'string', required: true, description: 'Message text' },
          { name: 'attachments', type: 'array', required: false, description: 'Message attachments' }
        ],
        responseFormat: 'json'
      }
    ]
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Send messages and notifications to Microsoft Teams channels',
    icon: '🟦',
    category: 'communication',
    features: ['Send messages', 'Create channels', 'Manage teams', 'File uploads'],
    requiredPermissions: ['ChannelMessage.Send', 'Channel.ReadBasic.All'],
    supportedActions: [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a channel',
        method: 'POST',
        endpoint: '/channels/{channelId}/messages',
        parameters: [
          { name: 'channelId', type: 'string', required: true, description: 'Channel ID' },
          { name: 'body', type: 'object', required: true, description: 'Message body' }
        ],
        responseFormat: 'json'
      }
    ]
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send messages and notifications to Discord channels',
    icon: '🎮',
    category: 'communication',
    features: ['Send messages', 'Create channels', 'Manage roles', 'File uploads'],
    requiredPermissions: ['SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
    supportedActions: [
      {
        id: 'send_message',
        name: 'Send Message',
        description: 'Send a message to a channel',
        method: 'POST',
        endpoint: '/channels/{channelId}/messages',
        parameters: [
          { name: 'channelId', type: 'string', required: true, description: 'Channel ID' },
          { name: 'content', type: 'string', required: true, description: 'Message content' }
        ],
        responseFormat: 'json'
      }
    ]
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    description: 'Manage incidents and escalations in PagerDuty',
    icon: '🚨',
    category: 'monitoring',
    features: ['Create incidents', 'Escalate alerts', 'Manage schedules', 'Update incidents'],
    requiredPermissions: ['incidents.write', 'escalations.read'],
    supportedActions: [
      {
        id: 'create_incident',
        name: 'Create Incident',
        description: 'Create a new incident',
        method: 'POST',
        endpoint: '/incidents',
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Incident title' },
          { name: 'service', type: 'string', required: true, description: 'Service ID' },
          { name: 'urgency', type: 'string', required: false, description: 'Incident urgency' }
        ],
        responseFormat: 'json'
      }
    ]
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create and manage issues in Jira',
    icon: '🎫',
    category: 'issue-tracking',
    features: ['Create issues', 'Update issues', 'Manage projects', 'Track workflows'],
    requiredPermissions: ['BROWSE_PROJECTS', 'CREATE_ISSUES', 'EDIT_ISSUES'],
    supportedActions: [
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue',
        method: 'POST',
        endpoint: '/issue',
        parameters: [
          { name: 'project', type: 'string', required: true, description: 'Project key' },
          { name: 'summary', type: 'string', required: true, description: 'Issue summary' },
          { name: 'description', type: 'string', required: false, description: 'Issue description' },
          { name: 'issuetype', type: 'string', required: true, description: 'Issue type' }
        ],
        responseFormat: 'json'
      }
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repositories, issues, and workflows in GitHub',
    icon: '🐙',
    category: 'deployment',
    features: ['Manage repositories', 'Create issues', 'Trigger workflows', 'Manage PRs'],
    requiredPermissions: ['repo', 'issues', 'actions'],
    supportedActions: [
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new issue',
        method: 'POST',
        endpoint: '/repos/{owner}/{repo}/issues',
        parameters: [
          { name: 'owner', type: 'string', required: true, description: 'Repository owner' },
          { name: 'repo', type: 'string', required: true, description: 'Repository name' },
          { name: 'title', type: 'string', required: true, description: 'Issue title' },
          { name: 'body', type: 'string', required: false, description: 'Issue body' }
        ],
        responseFormat: 'json'
      }
    ]
  }
];

// Predefined integration providers
const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    id: 'slack',
    name: 'Slack',
    type: 'slack',
    baseUrl: 'https://slack.com/api',
    authMethod: 'oauth',
    documentationUrl: 'https://api.slack.com/docs',
    supportsWebhooks: true,
    rateLimits: [
      { period: 'minute', limit: 100, burst: 20 },
      { period: 'hour', limit: 1000 }
    ]
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    type: 'teams',
    baseUrl: 'https://graph.microsoft.com/v1.0',
    authMethod: 'oauth',
    documentationUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview',
    supportsWebhooks: true,
    rateLimits: [
      { period: 'minute', limit: 600 },
      { period: 'hour', limit: 10000 }
    ]
  },
  {
    id: 'discord',
    name: 'Discord',
    type: 'discord',
    baseUrl: 'https://discord.com/api/v10',
    authMethod: 'token',
    documentationUrl: 'https://discord.com/developers/docs',
    supportsWebhooks: true,
    rateLimits: [
      { period: 'second', limit: 5, burst: 1 },
      { period: 'minute', limit: 300 }
    ]
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    type: 'pagerduty',
    baseUrl: 'https://api.pagerduty.com',
    authMethod: 'token',
    documentationUrl: 'https://developer.pagerduty.com/docs',
    supportsWebhooks: true,
    rateLimits: [
      { period: 'minute', limit: 960 },
      { period: 'hour', limit: 960 }
    ]
  },
  {
    id: 'jira',
    name: 'Jira',
    type: 'jira',
    baseUrl: 'https://your-domain.atlassian.net/rest/api/3',
    authMethod: 'basic',
    documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3',
    supportsWebhooks: true,
    rateLimits: [
      { period: 'minute', limit: 300 },
      { period: 'hour', limit: 10000 }
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    type: 'github',
    baseUrl: 'https://api.github.com',
    authMethod: 'token',
    documentationUrl: 'https://docs.github.com/en/rest',
    supportsWebhooks: true,
    rateLimits: [
      { period: 'hour', limit: 5000 }
    ]
  }
];

export class IntegrationService {
  private integrations: Map<string, Integration> = new Map();
  private usage: IntegrationUsage[] = [];
  private stats: IntegrationStats = {
    totalIntegrations: 0,
    activeIntegrations: 0,
    totalUsage: 0,
    successRate: 0,
    averageResponseTime: 0,
    topIntegrations: [],
    recentUsage: []
  };

  constructor() {
    this.initializeService();
  }

  // Initialize the service
  private async initializeService(): Promise<void> {
    await this.loadIntegrations();
    this.startStatsUpdater();
  }

  // Load integrations from storage
  private async loadIntegrations(): Promise<void> {
    try {
      const response = await fetch('/api/v1/integrations', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        const integrations: Integration[] = await response.json();
        integrations.forEach(integration => {
          this.integrations.set(integration.id, integration);
        });
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  }

  // Get available integration types
  getAvailableTypes(): IntegrationType[] {
    return INTEGRATION_TYPES;
  }

  // Get integration providers
  getProviders(): IntegrationProvider[] {
    return INTEGRATION_PROVIDERS;
  }

  // Create a new integration
  async createIntegration(integrationData: Omit<Integration, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Integration> {
    const integration: Integration = {
      ...integrationData,
      id: this.generateId(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const response = await fetch('/api/v1/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(integration)
      });

      if (!response.ok) {
        throw new Error(`Failed to create integration: ${response.status}`);
      }

      const createdIntegration = await response.json();
      this.integrations.set(createdIntegration.id, createdIntegration);
      return createdIntegration;
    } catch (error) {
      console.error('Failed to create integration:', error);
      throw error;
    }
  }

  // Update an integration
  async updateIntegration(id: string, updates: Partial<Integration>): Promise<Integration> {
    const integration = this.integrations.get(id);
    if (!integration) {
      throw new Error(`Integration not found: ${id}`);
    }

    const updatedIntegration = {
      ...integration,
      ...updates,
      updatedAt: new Date()
    };

    try {
      const response = await fetch(`/api/v1/integrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updatedIntegration)
      });

      if (!response.ok) {
        throw new Error(`Failed to update integration: ${response.status}`);
      }

      this.integrations.set(id, updatedIntegration);
      return updatedIntegration;
    } catch (error) {
      console.error('Failed to update integration:', error);
      throw error;
    }
  }

  // Delete an integration
  async deleteIntegration(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/v1/integrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete integration: ${response.status}`);
      }

      this.integrations.delete(id);
    } catch (error) {
      console.error('Failed to delete integration:', error);
      throw error;
    }
  }

  // Get integration by ID
  getIntegration(id: string): Integration | null {
    return this.integrations.get(id) || null;
  }

  // Get all integrations
  getIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }

  // Test integration connection
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const integration = this.integrations.get(id);
    if (!integration) {
      throw new Error(`Integration not found: ${id}`);
    }

    try {
      const response = await fetch(`/api/v1/integrations/${id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        await this.updateIntegration(id, { 
          status: 'connected',
          lastUsed: new Date()
        });
        return { success: true, message: 'Connection successful' };
      } else {
        await this.updateIntegration(id, { status: 'error' });
        return { success: false, message: result.error || 'Connection failed' };
      }
    } catch (error) {
      await this.updateIntegration(id, { status: 'error' });
      return { success: false, message: error.message };
    }
  }

  // Execute integration action
  async executeAction(integrationId: string, actionId: string, parameters: Record<string, any>): Promise<any> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const action = integration.type.supportedActions.find(a => a.id === actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(`/api/v1/integrations/${integrationId}/actions/${actionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(parameters)
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();

      // Record usage
      this.recordUsage({
        integrationId,
        timestamp: new Date(),
        action: actionId,
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : result.error,
        metadata: { parameters }
      });

      if (response.ok) {
        await this.updateIntegration(integrationId, { lastUsed: new Date() });
        return result;
      } else {
        throw new Error(result.error || 'Action execution failed');
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Record failed usage
      this.recordUsage({
        integrationId,
        timestamp: new Date(),
        action: actionId,
        success: false,
        responseTime,
        error: error.message,
        metadata: { parameters }
      });

      throw error;
    }
  }

  // Send message through integration
  async sendMessage(integrationId: string, message: string, channel?: string): Promise<void> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const targetChannel = channel || integration.config.defaultChannel;
    if (!targetChannel) {
      throw new Error('No channel specified');
    }

    // Apply message formatting and templates
    const formattedMessage = this.formatMessage(integration, message);

    await this.executeAction(integrationId, 'send_message', {
      channel: targetChannel,
      text: formattedMessage,
      ...integration.config.customFields
    });
  }

  // Format message based on integration config
  private formatMessage(integration: Integration, message: string): string {
    if (!integration.config.formatMessages) {
      return message;
    }

    // Apply templates and formatting
    let formattedMessage = message;

    // Add metadata if enabled
    if (integration.config.includeMetadata) {
      formattedMessage += `\n\n*Sent via OpsSight at ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}*`;
    }

    return formattedMessage;
  }

  // Record usage statistics
  private recordUsage(usage: IntegrationUsage): void {
    this.usage.push(usage);
    
    // Keep only recent usage (last 1000 entries)
    if (this.usage.length > 1000) {
      this.usage = this.usage.slice(-1000);
    }
  }

  // Start stats updater
  private startStatsUpdater(): void {
    setInterval(() => {
      this.updateStats();
    }, 60000); // Update every minute
  }

  // Update statistics
  private updateStats(): void {
    const integrations = Array.from(this.integrations.values());
    this.stats.totalIntegrations = integrations.length;
    this.stats.activeIntegrations = integrations.filter(i => i.enabled && i.status === 'connected').length;
    this.stats.totalUsage = this.usage.length;

    // Calculate success rate
    const successfulUsage = this.usage.filter(u => u.success).length;
    this.stats.successRate = this.usage.length > 0 ? (successfulUsage / this.usage.length) * 100 : 0;

    // Calculate average response time
    const totalResponseTime = this.usage.reduce((sum, u) => sum + u.responseTime, 0);
    this.stats.averageResponseTime = this.usage.length > 0 ? totalResponseTime / this.usage.length : 0;

    // Calculate top integrations
    const integrationUsage = new Map<string, number>();
    this.usage.forEach(usage => {
      const count = integrationUsage.get(usage.integrationId) || 0;
      integrationUsage.set(usage.integrationId, count + 1);
    });

    this.stats.topIntegrations = Array.from(integrationUsage.entries())
      .map(([integrationId, usage]) => {
        const integration = this.integrations.get(integrationId);
        return {
          integration: integration?.name || 'Unknown',
          usage
        };
      })
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    // Recent usage
    this.stats.recentUsage = this.usage
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);
  }

  // Get integration statistics
  getStats(): IntegrationStats {
    return { ...this.stats };
  }

  // Get integration usage history
  getUsageHistory(integrationId?: string): IntegrationUsage[] {
    if (integrationId) {
      return this.usage.filter(u => u.integrationId === integrationId);
    }
    return this.usage;
  }

  // OAuth flow helpers
  async initiateOAuth(integrationType: string): Promise<string> {
    try {
      const response = await fetch('/api/v1/integrations/oauth/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ type: integrationType })
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate OAuth: ${response.status}`);
      }

      const { authUrl } = await response.json();
      return authUrl;
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      throw error;
    }
  }

  async completeOAuth(integrationType: string, code: string, state: string): Promise<IntegrationCredentials> {
    try {
      const response = await fetch('/api/v1/integrations/oauth/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ type: integrationType, code, state })
      });

      if (!response.ok) {
        throw new Error(`Failed to complete OAuth: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to complete OAuth:', error);
      throw error;
    }
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

export const integrationService = new IntegrationService();