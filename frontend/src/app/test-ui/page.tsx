'use client';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

import React from 'react';

/**
 * UI Testing Page - Validate Invary Design Implementation
 */
export default function TestUIPage() {

  return (
    <div className="min-h-screen bg-white dark:bg-invary-primary p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Test */}
        <section className="text-center">
          <h1 className="text-responsive-hero font-bold mb-4">
            <span className="text-invary-primary dark:text-white">UI Test</span>{' '}
            <span className="text-gradient-primary">Page</span>
          </h1>
          <p className="text-responsive-subtitle text-invary-neutral dark:text-gray-300">
            Testing the Invary design implementation
          </p>
        </section>

        {/* Color Palette Test */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-invary-primary dark:text-white">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="w-full h-20 bg-invary-primary rounded-lg"></div>
              <p className="text-sm text-invary-neutral dark:text-gray-400">Primary (#434C62)</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-invary-secondary rounded-lg"></div>
              <p className="text-sm text-invary-neutral dark:text-gray-400">Secondary (#4E4E62)</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-invary-accent rounded-lg"></div>
              <p className="text-sm text-invary-neutral dark:text-gray-400">Accent (#FF7662)</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-20 bg-invary-neutral rounded-lg"></div>
              <p className="text-sm text-invary-neutral dark:text-gray-400">Neutral (#565656)</p>
            </div>
          </div>
        </section>

        {/* Button Tests */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-invary-primary dark:text-white">Button Styles</h2>
          <div className="flex flex-wrap gap-4">
            <button className="btn btn-primary">Primary Button</button>
            <button className="btn btn-secondary">Secondary Button</button>
            <button className="btn btn-accent">Accent Button</button>
          </div>
        </section>

        {/* Typography Tests */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-invary-primary dark:text-white">Typography</h2>
          <div className="space-y-4">
            <h1 className="text-responsive-hero font-bold">
              <span className="text-gradient-primary">Gradient Hero Text</span>
            </h1>
            <h2 className="text-responsive-title font-semibold text-invary-primary dark:text-white">
              Responsive Title Text
            </h2>
            <p className="text-responsive-subtitle text-invary-neutral dark:text-gray-300">
              Responsive subtitle text that adapts to screen size
            </p>
            <div className="text-gradient-accent text-xl font-semibold">
              Accent Gradient Text
            </div>
          </div>
        </section>

        {/* Chart Tests - Temporarily disabled for containerization */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-invary-primary dark:text-white">Chart Components</h2>
          <div className="bg-white dark:bg-invary-secondary/10 p-6 rounded-xl border border-gray-200 dark:border-invary-secondary/20">
            <p className="text-invary-neutral dark:text-gray-300">
              Chart components will be available after containerization is complete.
            </p>
          </div>
        </section>

        {/* Card Tests */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-invary-primary dark:text-white">Card Components</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-invary-secondary/10 border border-gray-200 dark:border-invary-secondary/20 rounded-xl p-6 hover:border-invary-accent/50 transition-all duration-300 hover:shadow-invary">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl">📊</div>
                  <div className="px-2 py-1 text-xs font-medium rounded bg-invary-accent/10 text-invary-accent">
                    Test
                  </div>
                </div>
                <h3 className="text-invary-primary dark:text-white font-semibold text-lg mb-3">
                  Test Card {i}
                </h3>
                <p className="text-invary-neutral dark:text-gray-300 leading-relaxed mb-4">
                  This is a test card to validate the Invary design implementation.
                </p>
                <div className="flex items-center text-invary-accent font-medium group cursor-pointer">
                  <span>Learn More</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Background Test */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-invary-primary dark:text-white">Background Effects</h2>
          <div className="radial-gradient-bg p-8 rounded-xl border border-gray-200 dark:border-invary-secondary/20">
            <p className="text-center text-invary-primary dark:text-white">
              This section has a radial gradient background effect
            </p>
          </div>
        </section>

        {/* Theme Colors Reference - Temporarily disabled */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-invary-primary dark:text-white">Chart Theme Colors</h2>
          <div className="bg-white dark:bg-invary-secondary/10 p-6 rounded-xl border border-gray-200 dark:border-invary-secondary/20">
            <p className="text-invary-neutral dark:text-gray-300">
              Theme colors will be displayed after containerization is complete.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}