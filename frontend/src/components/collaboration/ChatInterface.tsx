'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCollaboration } from '@/hooks/useCollaboration';
import { ChatMessage, ChatChannel } from '@/types/collaboration';

interface ChatInterfaceProps {
  className?: string;
  embedded?: boolean;
  height?: string;
}

export function ChatInterface({ className = '', embedded = false, height = '400px' }: ChatInterfaceProps) {
  const {
    channels,
    activeChannel,
    setActiveChannel,
    messages,
    onlineUsers,
    notifications,
    loading,
    connected,
    typing,
    sendMessage,
    addReaction,
    markAsRead,
    setUserTyping,
    createChannel,
    unreadNotifications,
    totalUnreadMessages
  } = useCollaboration();

  const [messageInput, setMessageInput] = useState('');
  const [showChannelList, setShowChannelList] = useState(!embedded);
  const [showUserList, setShowUserList] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark channel as read when it becomes active
  useEffect(() => {
    if (activeChannel && activeChannel.unreadCount > 0) {
      markAsRead(activeChannel.id);
    }
  }, [activeChannel, markAsRead]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeChannel) return;

    await sendMessage(activeChannel.id, messageInput.trim());
    setMessageInput('');
    setUserTyping(activeChannel.id, false);
    inputRef.current?.focus();
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    if (activeChannel) {
      setUserTyping(activeChannel.id, value.length > 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getUserStatus = (userId: string) => {
    const user = onlineUsers.find(u => u.id === userId);
    return user?.status || 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isSystem = message.type === 'system';
    const isCode = message.type === 'code';
    const status = getUserStatus(message.author.id);

    return (
      <div key={message.id} className={`group px-4 py-2 hover:bg-slate-800/20 ${isSystem ? 'opacity-70' : ''}`}>
        <div className="flex items-start space-x-3">
          {!isSystem && (
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {message.author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-kassow-dark ${getStatusColor(status)}`}></div>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {!isSystem && (
              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-kassow-light font-medium text-sm">{message.author.name}</span>
                <span className="text-slate-500 text-xs">{formatTimestamp(message.timestamp)}</span>
                {message.author.role && (
                  <span className="text-slate-400 text-xs">" {message.author.role}</span>
                )}
              </div>
            )}
            
            <div className={`text-sm ${isSystem ? 'text-slate-400 italic' : 'text-kassow-light'}`}>
              {isCode ? (
                <pre className="bg-kassow-dark p-3 rounded border border-gray-700/50 overflow-x-auto">
                  <code className="text-emerald-400 font-mono text-xs">{message.content}</code>
                </pre>
              ) : (
                <div className="leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </div>

            {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="flex items-center space-x-1 mt-2">
                {message.reactions.map((reaction, idx) => (
                  <button
                    key={idx}
                    onClick={() => addReaction(message.id, reaction.emoji)}
                    className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-full text-xs transition-colors"
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-slate-300">{reaction.count}</span>
                  </button>
                ))}
                <button
                  onClick={() => addReaction(message.id, '=M')}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-all text-xs"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-kassow-accent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-kassow-darker/50 backdrop-blur border border-gray-700/50 rounded-lg flex ${className}`} style={{ height }}>
      {/* Channel Sidebar */}
      {showChannelList && (
        <div className="w-64 border-r border-gray-700/50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-kassow-light font-semibold">Channels</h3>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="w-6 h-6 rounded bg-kassow-accent text-white flex items-center justify-center hover:bg-kassow-accent-hover transition-colors"
              >
                +
              </button>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <span className="text-slate-400">{connected ? 'Connected' : 'Disconnected'}</span>
              {totalUnreadMessages > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-medium">
                  {totalUnreadMessages}
                </span>
              )}
            </div>
          </div>

          {/* Channel List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {channels.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    activeChannel?.id === channel.id
                      ? 'bg-kassow-accent text-white'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-slate-400">
                        {channel.type === 'direct' ? '=¬' : 
                         channel.type === 'private' ? '=' : 
                         channel.type === 'incident' ? '=¨' : '#'}
                      </span>
                      <span className="font-medium truncate">{channel.name}</span>
                    </div>
                    {channel.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-medium">
                        {channel.unreadCount}
                      </span>
                    )}
                  </div>
                  {channel.lastMessage && (
                    <div className="text-xs text-slate-400 mt-1 truncate">
                      {channel.lastMessage.author.name}: {channel.lastMessage.content}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Online Users */}
          <div className="border-t border-gray-700/50 p-2">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="w-full text-left text-xs text-slate-400 hover:text-kassow-light transition-colors flex items-center justify-between"
            >
              <span>Online ({onlineUsers.filter(u => u.status === 'online').length})</span>
              <svg className={`w-4 h-4 transition-transform ${showUserList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showUserList && (
              <div className="mt-2 space-y-1">
                {onlineUsers.filter(u => u.status === 'online').map(user => (
                  <div key={user.id} className="flex items-center space-x-2 py-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(user.status)}`}></div>
                    <span className="text-xs text-slate-300 truncate">{user.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">
                      {activeChannel.type === 'direct' ? '=¬' : 
                       activeChannel.type === 'private' ? '=' : 
                       activeChannel.type === 'incident' ? '=¨' : '#'}
                    </span>
                    <h3 className="text-kassow-light font-semibold">{activeChannel.name}</h3>
                    <span className="text-slate-400 text-sm">
                      {activeChannel.members.length} member{activeChannel.members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {activeChannel.topic && (
                    <p className="text-slate-400 text-sm mt-1">{activeChannel.topic}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {embedded && (
                    <button
                      onClick={() => setShowChannelList(!showChannelList)}
                      className="p-2 text-slate-400 hover:text-kassow-light transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  )}
                  {unreadNotifications > 0 && (
                    <div className="relative">
                      <button className="p-2 text-slate-400 hover:text-kassow-light transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3a1 1 0 012 0v14z" />
                        </svg>
                      </button>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {unreadNotifications}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {messages.map((message, index) => renderMessage(message, index))}
              
              {/* Typing Indicators */}
              {typing.length > 0 && (
                <div className="px-4 py-2">
                  <div className="flex items-center space-x-2 text-slate-400 text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>
                      {typing.length === 1 
                        ? `${onlineUsers.find(u => u.id === typing[0])?.name || 'Someone'} is typing...`
                        : `${typing.length} people are typing...`
                      }
                    </span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700/50">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Message #${activeChannel.name}`}
                    className="w-full px-3 py-2 bg-kassow-dark border border-gray-600 rounded-lg text-kassow-light placeholder-slate-400 focus:border-kassow-accent focus:outline-none resize-none"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="px-4 py-2 bg-kassow-accent text-white rounded-lg hover:bg-kassow-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">=¬</div>
              <h3 className="text-kassow-light font-semibold mb-2">Welcome to Team Chat</h3>
              <p className="text-slate-400">Select a channel to start collaborating</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-kassow-darker border border-gray-700/50 rounded-lg p-6 w-96">
            <h3 className="text-kassow-light font-semibold mb-4">Create Channel</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="general-discussion"
                  className="w-full px-3 py-2 bg-kassow-dark border border-gray-600 rounded text-kassow-light focus:border-kassow-accent focus:outline-none"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={async () => {
                    if (newChannelName.trim()) {
                      await createChannel(newChannelName.trim());
                      setNewChannelName('');
                      setShowCreateChannel(false);
                    }
                  }}
                  className="flex-1 py-2 bg-kassow-accent text-white rounded hover:bg-kassow-accent-hover transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setNewChannelName('');
                    setShowCreateChannel(false);
                  }}
                  className="flex-1 py-2 bg-slate-600 text-slate-300 rounded hover:bg-slate-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}