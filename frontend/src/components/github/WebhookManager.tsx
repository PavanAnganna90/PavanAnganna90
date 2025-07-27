'use client';

import React, { useState } from 'react';
import { useWebhookManagement, useWebhookSetup, useWebhookActivity } from '@/hooks/useWebhooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Webhook, 
  CheckCircle, 
  XCircle, 
  Copy, 
  ExternalLink,
  Activity,
  Settings,
  TestTube,
  AlertCircle
} from 'lucide-react';

interface WebhookManagerProps {
  className?: string;
}

const WebhookManager: React.FC<WebhookManagerProps> = ({ className }) => {
  const {
    config,
    stats,
    validation,
    isLoading,
    hasError,
    testWebhook,
    isTesting,
    testResult,
    testError,
    refetch
  } = useWebhookManagement();

  const {
    setupSteps,
    supportedEvents,
    webhookUrl,
    isSetupComplete,
    eventDescriptions,
    securityNotes
  } = useWebhookSetup();

  const {
    totalEvents,
    eventTypeStats,
    lastProcessed,
    isActive,
    hasRecentActivity
  } = useWebhookActivity();

  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const runTest = () => {
    testWebhook();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading webhook configuration...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Webhook Configuration</h3>
          <p className="text-gray-600 mb-4">
            There was an error loading the webhook settings.
          </p>
          <Button onClick={refetch}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Webhook className="h-6 w-6" />
            <h2 className="text-xl font-semibold">GitHub Webhook Management</h2>
          </div>
          <Badge 
            variant={isSetupComplete ? "default" : "secondary"}
            className={isSetupComplete ? "bg-green-100 text-green-800" : ""}
          >
            {isSetupComplete ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
            ) : (
              <><Settings className="h-3 w-3 mr-1" /> Setup Required</>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold">{totalEvents}</p>
            <p className="text-sm text-gray-600">Total Events</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <TestTube className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold">{eventTypeStats.length}</p>
            <p className="text-sm text-gray-600">Event Types</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium">
              {hasRecentActivity ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-gray-600">
              {lastProcessed ? `Last: ${new Date(lastProcessed).toLocaleDateString()}` : 'No activity'}
            </p>
          </div>
        </div>
      </Card>

      {/* Webhook URL Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Webhook URL</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <code className="text-sm font-mono text-gray-800 flex-1 mr-4">
              {webhookUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyWebhookUrl}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {copiedUrl ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={runTest}
            disabled={isTesting}
            className="flex items-center gap-2"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4" />
            )}
            Test Webhook
          </Button>
          <a
            href="https://github.com/settings/hooks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub Settings
          </a>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Test Successful</span>
            </div>
            <p className="text-sm text-green-700">{testResult.testResult.message}</p>
          </div>
        )}

        {testError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-800">Test Failed</span>
            </div>
            <p className="text-sm text-red-700">{testError.message}</p>
          </div>
        )}
      </Card>

      {/* Setup Instructions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Setup Instructions</h3>
        <div className="space-y-3">
          {setupSteps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <p className="text-sm text-gray-700">{step}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Supported Events */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Supported Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportedEvents.map((event) => (
            <div key={event} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono font-medium">{event}</code>
                <Badge variant="outline" className="text-xs">
                  {eventTypeStats.find(s => s.type === event)?.count || 0}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">
                {eventDescriptions[event] || `Handles ${event} events from GitHub`}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Event Statistics */}
      {totalEvents > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Event Activity</h3>
          <div className="space-y-3">
            {eventTypeStats.map((stat) => (
              <div key={stat.type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono">{stat.type}</code>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[100px]">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{stat.count}</span>
                  <span>({stat.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Security Notes */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold">Security Information</h3>
        </div>
        <div className="space-y-2">
          {securityNotes.map((note, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0" />
              <p className="text-sm text-gray-700">{note}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default WebhookManager;