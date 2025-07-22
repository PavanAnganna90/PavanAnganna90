'use client';

import React, { useState } from 'react';
import { Settings, User, Bell, Shield, Palette, Monitor } from 'lucide-react';
import { StatusIndicator } from '@/components/orbit/StatusIndicator';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'monitoring', label: 'Monitoring', icon: Monitor }
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text-primary truncate">
                Settings
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Configure your platform preferences and security settings
              </p>
            </div>
            <div className="shrink-0">
              <StatusIndicator status="healthy" label="Configuration Valid" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1 overflow-x-auto lg:overflow-x-visible">
              <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1 pb-2 lg:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap lg:w-full ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
              </div>
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-card border border-border rounded-lg p-4 sm:p-6 shadow-soft">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-card-foreground mb-4">General Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          Platform Name
                        </label>
                        <input
                          type="text"
                          defaultValue="OpsSight"
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          Default Environment
                        </label>
                        <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent">
                          <option>Production</option>
                          <option>Staging</option>
                          <option>Development</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          Auto-refresh Interval
                        </label>
                        <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent">
                          <option>30 seconds</option>
                          <option>1 minute</option>
                          <option>5 minutes</option>
                          <option>Manual</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Profile Settings</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          defaultValue="Platform"
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          defaultValue="Administrator"
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        defaultValue="admin@opssight.com"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Role
                      </label>
                      <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option>Platform Administrator</option>
                        <option>DevOps Engineer</option>
                        <option>Developer</option>
                        <option>Viewer</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium text-card-foreground">Email Notifications</h3>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium text-card-foreground">Deployment Alerts</h3>
                        <p className="text-sm text-muted-foreground">Get notified about deployment status changes</p>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-medium text-card-foreground">System Health Alerts</h3>
                        <p className="text-sm text-muted-foreground">Receive alerts about system health issues</p>
                      </div>
                      <input type="checkbox" defaultChecked className="toggle" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Security Settings</h2>
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg">
                      <h3 className="font-medium text-card-foreground mb-2">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground mb-3">Add an extra layer of security to your account</p>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        Enable 2FA
                      </button>
                    </div>
                    <div className="p-4 border border-border rounded-lg">
                      <h3 className="font-medium text-card-foreground mb-2">Session Timeout</h3>
                      <p className="text-sm text-muted-foreground mb-3">Automatically log out after inactivity</p>
                      <select className="w-full max-w-xs px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option>15 minutes</option>
                        <option>30 minutes</option>
                        <option>1 hour</option>
                        <option>4 hours</option>
                        <option>Never</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Appearance Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-card-foreground mb-2">Theme</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <button className="p-3 border-2 border-primary rounded-lg bg-background">
                          <div className="w-full h-16 bg-gradient-to-br from-background to-muted rounded mb-2"></div>
                          <span className="text-xs font-medium">Light</span>
                        </button>
                        <button className="p-3 border border-border rounded-lg bg-background hover:border-primary">
                          <div className="w-full h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded mb-2"></div>
                          <span className="text-xs font-medium">Dark</span>
                        </button>
                        <button className="p-3 border border-border rounded-lg bg-background hover:border-primary">
                          <div className="w-full h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded mb-2"></div>
                          <span className="text-xs font-medium">Auto</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-card-foreground mb-2">Dashboard Layout</h3>
                      <select className="w-full max-w-xs px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option>Compact</option>
                        <option>Standard</option>
                        <option>Spacious</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'monitoring' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-card-foreground mb-4">Monitoring Configuration</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-card-foreground mb-2">Metrics Collection</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <span className="text-sm">Enable Prometheus metrics</span>
                          <input type="checkbox" defaultChecked className="toggle" />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <span className="text-sm">Collect application logs</span>
                          <input type="checkbox" defaultChecked className="toggle" />
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <span className="text-sm">Performance monitoring</span>
                          <input type="checkbox" defaultChecked className="toggle" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-card-foreground mb-2">Retention Period</h3>
                      <select className="w-full max-w-xs px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent">
                        <option>7 days</option>
                        <option>30 days</option>
                        <option>90 days</option>
                        <option>1 year</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex gap-3">
                  <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    Save Changes
                  </button>
                  <button className="px-6 py-2 border border-border text-muted-foreground rounded-md hover:bg-muted transition-colors">
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}