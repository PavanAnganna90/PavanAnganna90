'use client';

import React, { useState } from 'react';
import { useRealTimeNotifications } from '../../hooks/useRealTimeData';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useRealTimeNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'alerts') return notification.type === 'alert';
    return true;
  });

  const getNotificationIcon = (type: string, severity: string) => {
    if (type === 'alert') {
      return (
        <svg className={`w-5 h-5 text-${severity === 'error' ? 'red' : severity === 'warning' ? 'amber' : 'blue'}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    
    if (type === 'team') {
      return (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="fixed top-0 right-0 h-full w-96 bg-kassow-darker/95 backdrop-blur-lg border-l border-gray-700/50 shadow-2xl z-50 transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-700/50">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'alerts', label: 'Alerts' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                filter === key
                  ? 'text-kassow-accent border-b-2 border-kassow-accent'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
              {key === 'unread' && unreadCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between p-3 border-b border-gray-700/50 bg-kassow-dark/50">
            <button
              onClick={markAllAsRead}
              className="text-xs text-kassow-accent hover:text-kassow-accent-hover transition-colors"
            >
              Mark all as read
            </button>
            <button
              onClick={clearNotifications}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5V7a9.5 9.5 0 0119 0v10z" />
              </svg>
              <p className="text-slate-400 text-sm">
                {filter === 'unread' ? 'No unread notifications' : 
                 filter === 'alerts' ? 'No alerts' : 
                 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-kassow-dark/50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-kassow-accent/5 border-l-4 border-kassow-accent' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    if (notification.actionUrl) {
                      window.open(notification.actionUrl, '_blank');
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type, notification.severity)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium ${notification.read ? 'text-slate-300' : 'text-white'}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2 ml-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-kassow-accent rounded-full"></div>
                          )}
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`mt-1 text-sm ${notification.read ? 'text-slate-400' : 'text-slate-300'}`}>
                        {notification.message}
                      </p>
                      
                      {notification.actionUrl && (
                        <button className="mt-2 text-xs text-kassow-accent hover:text-kassow-accent-hover">
                          View Details →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationCenter;