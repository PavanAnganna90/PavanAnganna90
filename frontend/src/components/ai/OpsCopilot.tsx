'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../ui/LoadingStates';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  attachments?: CopilotAttachment[];
  context?: CopilotContext;
  metadata?: Record<string, any>;
}

interface CopilotAttachment {
  type: 'code' | 'chart' | 'config' | 'log' | 'metric' | 'link';
  title: string;
  content: string;
  language?: string;
  actions?: Array<{
    label: string;
    action: string;
    data?: any;
  }>;
}

interface CopilotContext {
  currentPage: string;
  selectedResources: string[];
  recentActions: string[];
  userProfile: {
    role: string;
    expertise: string[];
    preferences: Record<string, any>;
  };
  systemState: {
    alerts: number;
    deployments: number;
    incidents: number;
    performance: Record<string, number>;
  };
}

interface OpsCopilotProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  context?: CopilotContext;
  onActionRequested?: (action: string, data?: any) => void;
}

const QUICK_COMMANDS = [
  { label: 'Analyze system performance', category: 'analysis' },
  { label: 'Check security vulnerabilities', category: 'security' },
  { label: 'Generate deployment script', category: 'code' },
  { label: 'Show cost optimization', category: 'cost' },
  { label: 'Predict resource usage', category: 'prediction' },
  { label: 'Review recent alerts', category: 'monitoring' },
];

const SUGGESTED_RESPONSES = {
  analysis: [
    "Traffic spike due to marketing campaign launch at 2 PM EST",
    "Memory leak detected in payment service v2.3.1",
    "Database query timeout increased due to missing index"
  ],
  cost: [
    "Found 3 unused load balancers saving $340/month",
    "Auto-scaling policy can be optimized to save 25%",
    "Spot instances recommended for dev environments"
  ],
  health: [
    "All critical services: ✅ Healthy",
    "⚠️ API latency above threshold (p99: 1.2s)",
    "🔄 2 deployments in progress"
  ]
};

export const OpsCopilot: React.FC<OpsCopilotProps> = ({ 
  className = '', 
  isOpen, 
  onClose, 
  context = {
    currentPage: 'dashboard',
    selectedResources: [],
    recentActions: [],
    userProfile: {
      role: 'DevOps Engineer',
      expertise: ['kubernetes', 'aws', 'monitoring'],
      preferences: {}
    },
    systemState: {
      alerts: 0,
      deployments: 0,
      incidents: 0,
      performance: {}
    }
  },
  onActionRequested = () => {}
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello! I'm OpsCopilot, your AI-powered DevOps assistant. I can help you with:

• **Infrastructure troubleshooting** - Diagnose and resolve issues
• **Performance optimization** - Identify bottlenecks and improvements  
• **Security analysis** - Detect vulnerabilities and suggest fixes
• **Code generation** - Create configs, scripts, and automation
• **Predictive insights** - Forecast trends and potential issues
• **Best practices** - Recommend industry standards and patterns

What would you like to work on today?`,
      timestamp: new Date(),
      suggestions: ['Analyze system performance', 'Check for security vulnerabilities', 'Generate deployment script', 'Optimize database queries', 'Review recent alerts'],
      context
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [capabilities] = useState({
    codeGeneration: true,
    troubleshooting: true,
    optimization: true,
    monitoring: true,
    security: true,
    prediction: true,
    learning: true
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time system monitoring for context
  const { data: systemData } = useRealTimeData({
    endpoint: '/api/system/status',
    enabled: true,
    interval: 30000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Enhanced AI processing with context awareness
  const processAIRequest = useCallback(async (userMessage: string): Promise<Message> => {
    try {
      const response = await fetch('/api/ai/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          capabilities,
          systemData,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const aiResponse = await response.json();

      return {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        context,
        suggestions: aiResponse.suggestions,
        attachments: aiResponse.attachments,
        metadata: aiResponse.metadata,
      };
    } catch (error) {
      console.error('AI response failed:', error);
      return {
        id: `error_${Date.now()}`,
        type: 'system',
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        timestamp: new Date(),
        context,
      };
    }
  }, [context, messages, capabilities, systemData]);

  // Fallback simulation for development
  const simulateAIResponse = (userMessage: string): Message => {
    const lowerMessage = userMessage.toLowerCase();
    
    let content = '';
    let attachments: CopilotAttachment[] = [];
    let suggestions: string[] = [];
    
    if (lowerMessage.includes('spike') || lowerMessage.includes('yesterday')) {
      content = "I found a significant traffic spike yesterday at 2:47 PM EST. Analysis shows it was triggered by a marketing campaign launch. The spike reached 340% of normal traffic levels. Here's what happened:\n\n• Campaign went live on social media\n• Payment service response time increased by 200ms\n• Auto-scaling kicked in after 3 minutes\n• No service degradation occurred\n\nRecommendation: Consider pre-scaling before scheduled campaigns.";
      attachments = [{
        type: 'chart',
        title: 'Traffic Spike Analysis',
        content: 'Chart showing traffic patterns and spike details',
        actions: [{ label: 'View Details', action: 'view_traffic_details' }]
      }];
      suggestions = ['Set up pre-scaling', 'Create alert for campaigns', 'View full analysis'];
    }
    else if (lowerMessage.includes('script') || lowerMessage.includes('generate')) {
      content = "I'll generate a deployment script for you. Based on your current setup, here's a Kubernetes deployment script:";
      attachments = [{
        type: 'code',
        title: 'Kubernetes Deployment Script',
        language: 'yaml',
        content: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"`,
        actions: [
          { label: 'Apply', action: 'apply_deployment' },
          { label: 'Copy', action: 'copy_code' },
          { label: 'Save', action: 'save_script' }
        ]
      }];
      suggestions = ['Generate service config', 'Create ingress', 'Add health checks'];
    }
    else if (lowerMessage.includes('security') || lowerMessage.includes('vulnerability')) {
      content = "Security analysis complete! I found several areas that need attention:\n\n🔒 **Critical Issues**:\n• Outdated dependencies with known CVEs\n• Missing security headers in API responses\n• Weak password policies\n\n⚠️ **Recommendations**:\n• Update Node.js to latest LTS version\n• Implement Content Security Policy\n• Enable 2FA for all admin accounts\n• Regular security audits\n\nShould I create a security remediation plan?";
      attachments = [{
        type: 'config',
        title: 'Security Headers Configuration',
        content: `helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})`,
        actions: [{ label: 'Apply Config', action: 'apply_security_config' }]
      }];
      suggestions = ['Run vulnerability scan', 'Update dependencies', 'Enable 2FA'];
    }
    else {
      content = "I understand you're asking about: " + userMessage + "\n\nBased on current system data, I can help you with:\n• Performance analysis and troubleshooting\n• Cost optimization recommendations\n• Deployment and rollback assistance\n• Resource usage predictions\n• Security and compliance insights\n\nCould you be more specific about what you'd like to analyze?";
      suggestions = ['System health check', 'Performance analysis', 'Cost optimization', 'Security scan'];
    }
    
    return {
      id: `assistant_${Date.now()}`,
      type: 'assistant',
      content,
      timestamp: new Date(),
      attachments,
      suggestions,
      context
    };
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
      context
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      // Try to use real AI endpoint first, fallback to simulation
      const aiResponse = await processAIRequest(currentInput);
      setMessages(prev => [...prev, aiResponse]);
      
      // Learn from user interaction
      if (capabilities.learning) {
        fetch('/api/ai/copilot/learn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userMessage: currentInput,
            aiResponse: aiResponse.content,
            context,
            feedback: null,
          }),
        }).catch(err => console.error('Learning failed:', err));
      }
    } catch (error) {
      // Fallback to simulation
      setTimeout(() => {
        const response = simulateAIResponse(currentInput);
        setMessages(prev => [...prev, response]);
        setIsTyping(false);
      }, 1500 + Math.random() * 1000);
      return;
    }
    
    setIsTyping(false);
  };

  const handleQuickCommand = (command: string) => {
    setInput(command);
    setTimeout(() => handleSendMessage(), 100);
  };

  // Handle attachment actions
  const handleAttachmentAction = useCallback((attachment: CopilotAttachment, action: string, data?: any) => {
    onActionRequested(action, { attachment, data });
  }, [onActionRequested]);

  // Render attachment based on type
  const renderAttachment = useCallback((attachment: CopilotAttachment) => {
    switch (attachment.type) {
      case 'code':
        return (
          <div className="bg-gray-900 rounded-lg p-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{attachment.title}</span>
              <div className="flex space-x-2">
                {attachment.actions?.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAttachmentAction(attachment, action.action, action.data)}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            <pre className="text-sm text-gray-100 overflow-x-auto">
              <code className={`language-${attachment.language || 'text'}`}>
                {attachment.content}
              </code>
            </pre>
          </div>
        );

      case 'chart':
        return (
          <div className="bg-slate-700/50 rounded-lg p-4 mt-2">
            <h4 className="text-sm font-medium text-white mb-2">
              {attachment.title}
            </h4>
            <div className="h-32 flex items-center justify-center text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="ml-2 text-sm">{attachment.title}</span>
            </div>
            {attachment.actions && (
              <div className="flex space-x-2 mt-2">
                {attachment.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAttachmentAction(attachment, action.action, action.data)}
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'config':
        return (
          <div className="bg-yellow-900/20 rounded-lg p-4 mt-2">
            <h4 className="text-sm font-medium text-yellow-200 mb-2">
              {attachment.title}
            </h4>
            <pre className="text-sm text-yellow-100 overflow-x-auto">
              {attachment.content}
            </pre>
            {attachment.actions && (
              <div className="flex space-x-2 mt-2">
                {attachment.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAttachmentAction(attachment, action.action, action.data)}
                    className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-slate-700/50 rounded-lg p-4 mt-2">
            <h4 className="text-sm font-medium text-white mb-2">
              {attachment.title}
            </h4>
            <p className="text-sm text-slate-300">
              {attachment.content}
            </p>
          </div>
        );
    }
  }, [handleAttachmentAction]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="w-full max-w-4xl h-[80vh] bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">OpsCopilot</h2>
              <p className="text-sm text-slate-400">AI Operations Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            aria-label="Close OpsCopilot"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ height: 'calc(80vh - 200px)' }}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-cyan-600' : 'bg-slate-800'} rounded-2xl p-4`}>
                <div className="text-white whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {message.attachments?.map((attachment, index) => (
                  <div key={index}>
                    {renderAttachment(attachment)}
                  </div>
                ))}
                
                {message.suggestions && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickCommand(suggestion)}
                        className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-xs transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-2">
                  {format(message.timestamp, 'HH:mm:ss')}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-slate-400 text-sm">OpsCopilot is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Commands */}
        <div className="px-6 py-3 border-t border-slate-700">
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMANDS.map((cmd, index) => (
              <button
                key={index}
                onClick={() => handleQuickCommand(cmd.label)}
                className="px-3 py-1 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about system performance, costs, deployments..."
              className="flex-1 px-4 py-3 bg-slate-800/60 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 