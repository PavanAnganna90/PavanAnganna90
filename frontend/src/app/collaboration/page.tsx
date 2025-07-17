'use client';

import React, { useState } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { ChatInterface } from '@/components/collaboration/ChatInterface';
import { OnlineUser, Notification, CollaborationContext } from '@/types/collaboration';

interface CollaborationPageState {
  activeTab: 'chat' | 'notifications' | 'contexts' | 'users';
  showSidebar: boolean;
}

export default function CollaborationPage() {
  const {
    onlineUsers,
    notifications,
    contexts,
    loading,
    connected,
    markNotificationAsRead,
    unreadNotifications,
    totalUnreadMessages
  } = useCollaboration();

  const [state, setState] = useState<CollaborationPageState>({
    activeTab: 'chat',
    showSidebar: true
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: OnlineUser['status']) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-500/5';
      case 'high': return 'border-l-orange-500 bg-orange-500/5';
      case 'medium': return 'border-l-yellow-500 bg-yellow-500/5';
      default: return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const getContextStatusColor = (status: CollaborationContext['status']) => {
    switch (status) {
      case 'active': return 'text-emerald-400 bg-emerald-500/10';
      case 'resolved': return 'text-blue-400 bg-blue-500/10';
      case 'archived': return 'text-slate-400 bg-slate-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const NotificationsPanel = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-kassow-light font-semibold">Notifications</h3>
        {unreadNotifications > 0 && (
          <span className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium">
            {unreadNotifications} unread
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-slate-400 mb-2">=</div>
          <p className="text-slate-400">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
                notification.read ? 'opacity-60' : ''
              } ${getPriorityColor(notification.priority)}`}
              onClick={() => !notification.read && markNotificationAsRead(notification.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-kassow-light font-medium text-sm">{notification.title}</h4>
                  <p className="text-slate-400 text-sm mt-1">{notification.message}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-slate-500 text-xs">{formatTimestamp(notification.timestamp)}</span>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-kassow-accent rounded-full"></div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    notification.priority === 'urgent' ? 'bg-red-600 text-white' :
                    notification.priority === 'high' ? 'bg-orange-600 text-white' :
                    notification.priority === 'medium' ? 'bg-yellow-600 text-black' :
                    'bg-blue-600 text-white'
                  }`}>
                    {notification.priority.toUpperCase()}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {notification.source.name}
                  </span>
                </div>

                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex items-center space-x-2">
                    {notification.actions.map(action => (
                      <button
                        key={action.id}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          action.type === 'primary' ? 'bg-kassow-accent text-white hover:bg-kassow-accent-hover' :
                          action.type === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                          'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ContextsPanel = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-kassow-light font-semibold">Active Contexts</h3>
        <span className="text-slate-400 text-sm">{contexts.length} active</span>
      </div>

      {contexts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-slate-400 mb-2">></div>
          <p className="text-slate-400">No active collaboration contexts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contexts.map(context => (
            <div key={context.id} className="bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">
                      {context.type === 'incident' ? '=¨' :
                       context.type === 'alert' ? ' ' :
                       context.type === 'deployment' ? '=€' :
                       context.type === 'debug' ? '=' : '=Ý'}
                    </span>
                    <h4 className="text-kassow-light font-semibold">{context.title}</h4>
                  </div>
                  {context.description && (
                    <p className="text-slate-400 text-sm">{context.description}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getContextStatusColor(context.status)}`}>
                  {context.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Participants:</span>
                  <div className="mt-1 flex items-center space-x-1">
                    {context.participants.slice(0, 3).map(participant => {
                      const user = onlineUsers.find(u => u.id === participant.userId);
                      return (
                        <div key={participant.userId} className="flex items-center space-x-1">
                          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs">
                            {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                          </div>
                          {participant.role === 'lead' && (
                            <span className="text-yellow-400 text-xs">=Q</span>
                          )}
                        </div>
                      );
                    })}
                    {context.participants.length > 3 && (
                      <span className="text-slate-400 text-xs">+{context.participants.length - 3}</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Last Activity:</span>
                  <div className="text-kassow-light">{formatTimestamp(context.updatedAt)}</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <span className="text-slate-400">
                      =¬ {context.chat.messageCount} messages
                    </span>
                    <span className="text-slate-400">
                      =Î {context.resources.length} resources
                    </span>
                  </div>
                  <button className="text-kassow-accent hover:text-kassow-accent-hover transition-colors">
                    Join Context ’
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const UsersPanel = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-kassow-light font-semibold">Team Members</h3>
        <span className="text-slate-400 text-sm">
          {onlineUsers.filter(u => u.status === 'online').length} online
        </span>
      </div>

      <div className="space-y-2">
        {onlineUsers.map(user => (
          <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800/20 transition-colors">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-kassow-dark ${getStatusColor(user.status)}`}></div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-kassow-light font-medium">{user.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  user.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
                  user.status === 'busy' ? 'bg-red-500/20 text-red-400' :
                  user.status === 'away' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {user.status}
                </span>
              </div>
              <div className="text-slate-400 text-sm">{user.role}</div>
              {user.currentActivity && (
                <div className="text-slate-500 text-xs mt-1">
                  {user.currentActivity.type === 'debugging' ? '=' :
                   user.currentActivity.type === 'deploying' ? '=€' :
                   user.currentActivity.type === 'viewing' ? '=@' : '¡'} {user.currentActivity.resource}
                </div>
              )}
            </div>

            <div className="text-right text-xs text-slate-400">
              {formatTimestamp(user.lastSeen)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-kassow-dark">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kassow-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kassow-dark">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-kassow-light mb-2">Team Collaboration</h1>
              <p className="text-slate-400">Chat, share updates, and coordinate with your team</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'} ${!connected ? 'animate-pulse' : ''}`}></div>
                <span className={`text-sm font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {(totalUnreadMessages > 0 || unreadNotifications > 0) && (
                <div className="flex items-center space-x-2">
                  {totalUnreadMessages > 0 && (
                    <div className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium">
                      {totalUnreadMessages} unread messages
                    </div>
                  )}
                  {unreadNotifications > 0 && (
                    <div className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium">
                      {unreadNotifications} notifications
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-3">
            <ChatInterface height="calc(100vh - 200px)" />
          </div>

          {/* Sidebar */}
          {state.showSidebar && (
            <div className="lg:col-span-1">
              <div className="bg-kassow-darker/30 backdrop-blur border border-gray-700/50 rounded-lg">
                {/* Sidebar Tabs */}
                <div className="border-b border-gray-700/50">
                  <div className="flex">
                    {[
                      { key: 'notifications', label: 'Notifications', count: unreadNotifications },
                      { key: 'contexts', label: 'Contexts', count: contexts.filter(c => c.status === 'active').length },
                      { key: 'users', label: 'Users', count: onlineUsers.filter(u => u.status === 'online').length }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setState(prev => ({ ...prev, activeTab: tab.key as any }))}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors relative ${
                          state.activeTab === tab.key
                            ? 'text-kassow-accent border-b-2 border-kassow-accent'
                            : 'text-slate-400 hover:text-kassow-light'
                        }`}
                      >
                        {tab.label}
                        {tab.count > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                            {tab.count > 9 ? '9+' : tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Content */}
                <div className="p-4 max-h-96 overflow-y-auto">
                  {state.activeTab === 'notifications' && <NotificationsPanel />}
                  {state.activeTab === 'contexts' && <ContextsPanel />}
                  {state.activeTab === 'users' && <UsersPanel />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}