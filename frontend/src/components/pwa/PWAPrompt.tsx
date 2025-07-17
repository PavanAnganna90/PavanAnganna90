'use client';

import React, { useState, useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';

export function PWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { pwaInfo, installPWA } = usePWA();

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const hasBeenDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
    
    // Show prompt if PWA is installable and hasn't been dismissed
    if (pwaInfo.canInstall && !pwaInfo.isInstalled && !hasBeenDismissed) {
      // Delay showing the prompt to avoid interrupting the user experience
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [pwaInfo.canInstall, pwaInfo.isInstalled]);

  const handleInstall = async () => {
    const success = await installPWA();
    if (success || !pwaInfo.canInstall) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Set a reminder for 7 days from now
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 7);
    localStorage.setItem('pwa-prompt-reminder', reminderDate.toISOString());
  };

  if (!showPrompt || dismissed || pwaInfo.isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-kassow-darker/95 backdrop-blur-lg border border-gray-700/50 rounded-xl shadow-2xl p-4">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Install OpsSight</h3>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Add OpsSight to your home screen for quick access and offline capabilities.
            </p>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Works offline with cached data</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Native app-like experience</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Push notifications for alerts</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            className="flex-1 py-2 px-3 bg-kassow-accent text-white font-medium rounded-lg hover:bg-kassow-accent-hover transition-colors text-sm"
          >
            Install App
          </button>
          <button
            onClick={handleRemindLater}
            className="px-3 py-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAPrompt;