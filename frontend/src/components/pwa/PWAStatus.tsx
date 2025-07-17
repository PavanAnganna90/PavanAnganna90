'use client';

import React, { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';

interface PWAStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function PWAStatus({ className = '', showDetails = false }: PWAStatusProps) {
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const { pwaInfo, installPWA, updatePWA, clearCache, share, getStorageEstimate } = usePWA();

  const handleStorageInfo = async () => {
    if (!showStorageInfo) {
      const info = await getStorageEstimate();
      setStorageInfo(info);
    }
    setShowStorageInfo(!showStorageInfo);
  };

  const handleShare = () => {
    share({
      title: 'OpsSight Dashboard',
      text: 'Check out my DevOps monitoring dashboard',
      url: window.location.href
    });
  };

  if (!showDetails) {
    // Minimal status indicator
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${pwaInfo.isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
        <span className={`text-xs ${pwaInfo.isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
          {pwaInfo.isOnline ? 'Online' : 'Offline'}
        </span>
        {pwaInfo.isInstalled && (
          <div className="w-2 h-2 rounded-full bg-blue-500" title="Installed as PWA"></div>
        )}
      </div>
    );
  }

  // Detailed PWA status panel
  return (
    <div className={`bg-kassow-darker/80 backdrop-blur-lg rounded-lg border border-gray-700/50 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">App Status</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${pwaInfo.isOnline ? 'bg-emerald-500' : 'bg-amber-500'} ${!pwaInfo.isOnline ? 'animate-pulse' : ''}`}></div>
          <span className={`text-sm font-medium ${pwaInfo.isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
            {pwaInfo.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Installed:</span>
          <span className={`font-medium ${pwaInfo.isInstalled ? 'text-emerald-400' : 'text-slate-300'}`}>
            {pwaInfo.isInstalled ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Platform:</span>
          <span className="text-white font-medium capitalize">{pwaInfo.platform}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Standalone:</span>
          <span className={`font-medium ${pwaInfo.isStandalone ? 'text-emerald-400' : 'text-slate-300'}`}>
            {pwaInfo.isStandalone ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Installable:</span>
          <span className={`font-medium ${pwaInfo.canInstall ? 'text-blue-400' : 'text-slate-300'}`}>
            {pwaInfo.canInstall ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Update Status */}
      {pwaInfo.updateAvailable && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-blue-400 text-sm font-medium">Update Available</span>
          </div>
          <button
            onClick={updatePWA}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
          >
            Update Now
          </button>
        </div>
      )}

      {/* Storage Info */}
      <div className="mb-4">
        <button
          onClick={handleStorageInfo}
          className="flex items-center justify-between w-full text-left text-sm text-slate-400 hover:text-white transition-colors"
        >
          <span>Storage Usage</span>
          <svg className={`w-4 h-4 transition-transform ${showStorageInfo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showStorageInfo && storageInfo && (
          <div className="mt-2 p-2 bg-slate-700/30 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Used:</span>
              <span className="text-white">{storageInfo.usageInMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Available:</span>
              <span className="text-white">{storageInfo.quotaInMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Percentage:</span>
              <span className="text-white">{storageInfo.percentageUsed}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {pwaInfo.canInstall && !pwaInfo.isInstalled && (
          <button
            onClick={installPWA}
            className="w-full py-2 px-3 bg-kassow-accent text-white font-medium rounded-md hover:bg-kassow-accent-hover transition-colors text-sm"
          >
            Install App
          </button>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="py-2 px-3 bg-slate-600 text-slate-300 rounded-md hover:bg-slate-500 transition-colors text-sm"
          >
            Share
          </button>
          
          <button
            onClick={clearCache}
            className="py-2 px-3 bg-slate-600 text-slate-300 rounded-md hover:bg-slate-500 transition-colors text-sm"
          >
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAStatus;