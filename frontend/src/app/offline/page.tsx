'use client';

import React from 'react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-kassow-dark flex items-center justify-center">
      <div className="max-w-md w-full text-center px-6">
        <div className="bg-kassow-darker/80 backdrop-blur-lg rounded-xl shadow-2xl border border-gray-700/50 p-8">
          {/* Offline Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v20M2 12h20" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-kassow-light mb-4">
            You're Offline
          </h1>
          
          <p className="text-slate-400 mb-6 leading-relaxed">
            No internet connection detected. Some features may be limited, but you can still access cached data and previously viewed pages.
          </p>
          
          {/* Available Actions */}
          <div className="space-y-3 mb-6">
            <Link
              href="/dashboard"
              className="block w-full py-3 px-4 bg-kassow-accent text-white font-medium rounded-lg hover:bg-kassow-accent-hover transition-colors"
            >
              View Cached Dashboard
            </Link>
            
            <Link
              href="/infrastructure"
              className="block w-full py-3 px-4 bg-slate-600 text-slate-300 font-medium rounded-lg hover:bg-slate-500 transition-colors"
            >
              View Infrastructure Data
            </Link>
            
            <Link
              href="/pipelines"
              className="block w-full py-3 px-4 bg-slate-600 text-slate-300 font-medium rounded-lg hover:bg-slate-500 transition-colors"
            >
              View Pipeline History
            </Link>
          </div>
          
          {/* Retry Button */}
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 border border-gray-600 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors text-sm"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry Connection</span>
            </div>
          </button>
          
          {/* Connection Status */}
          <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center justify-center space-x-2 text-amber-400 text-sm">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              <span>OpsSight is working offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}