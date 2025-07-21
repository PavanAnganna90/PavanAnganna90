'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * OpsSight Landing Page - Following Design Rules
 * Design Goals: Clarity & Focus, Calmness Under Chaos, Tactile & Responsive, Trust & Control
 * Hierarchy: Overview → Drill-down → Action
 */
export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringAction, setIsHoveringAction] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearInterval(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Real-time System Health (Progress Rings - Behavioral Psychology)
  const [systemHealth, setSystemHealth] = useState([
    { name: 'CI/CD', status: 'healthy', value: 98.7, trend: '+2.3%', icon: '🚀', color: 'emerald' },
    { name: 'K8s Pods', status: 'excellent', value: 99.2, trend: '-1 restart', icon: '⚙️', color: 'blue' },
    { name: 'Cost', status: 'warning', value: 87.4, trend: '+12%', icon: '💰', color: 'amber' },
    { name: 'Latency', status: 'excellent', value: 95.8, trend: '-8ms', icon: '⚡', color: 'cyan' }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemHealth(prev => prev.map(metric => {
        const change = (Math.random() - 0.5) * 1.5;
        const newValue = Math.max(85, Math.min(100, metric.value + change));
        return { ...metric, value: Math.round(newValue * 10) / 10 };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return { bg: 'bg-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/25' };
      case 'healthy': return { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/25' };
      case 'warning': return { bg: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/25' };
      case 'critical': return { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/25' };
      default: return { bg: 'bg-slate-500', text: 'text-slate-400', glow: 'shadow-slate-500/25' };
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-invary-primary text-invary-primary dark:text-white overflow-hidden font-['Inter'] relative">
      {/* Minimal Background with Subtle Gradients */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-white dark:bg-invary-primary"></div>
        <div 
          className="radial-gradient-bg absolute w-96 h-96 rounded-full transition-transform duration-1000 ease-out"
          style={{
            transform: `translate(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px)`,
            top: '10%',
            left: '10%'
          }}
        ></div>
        
        {/* Clean minimal grid */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(var(--invary-primary) 1px, transparent 1px), linear-gradient(90deg, var(--invary-primary) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section - Overview Level */}
        <section className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            
            {/* Minimal Status Indicator */}
            <div className={`inline-flex items-center px-4 py-2 rounded-lg bg-gray-50 dark:bg-invary-secondary/20 border border-gray-200 dark:border-invary-secondary/30 mb-8 transition-all duration-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="relative mr-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-60"></div>
              </div>
              <span className="text-sm font-medium text-invary-primary dark:text-white">System Operational</span>
              <div className="mx-3 w-px h-3 bg-gray-300 dark:bg-invary-secondary"></div>
              <span className="text-xs text-invary-neutral dark:text-gray-400 tabular-nums">{currentTime.toLocaleTimeString()}</span>
            </div>

            {/* Clean Hero Section */}
            <div className="text-center mb-16">
              <h1 className={`text-responsive-hero font-bold mb-6 transition-all duration-700 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <span className="text-invary-primary dark:text-white">DevOps</span>{' '}
                <span className="text-gradient-primary">
                  Visibility
                </span>
                <br />
                <span className="text-invary-neutral dark:text-gray-400 text-responsive-title font-normal">Platform</span>
              </h1>

              <p className={`max-w-3xl mx-auto text-responsive-subtitle text-invary-neutral dark:text-gray-300 leading-relaxed mb-12 transition-all duration-700 delay-400 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                Transform chaos into clarity with evidence-based monitoring.
                <br />
                <span className="text-invary-accent font-medium">Everything you need at a glance.</span>
              </p>

              {/* Clean Primary Action */}
              <div className={`transition-all duration-700 delay-600 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <Link
                  href="/dashboard"
                  onMouseEnter={() => setIsHoveringAction(true)}
                  onMouseLeave={() => setIsHoveringAction(false)}
                  className="btn btn-accent inline-flex items-center px-8 py-4 text-base font-medium rounded-lg shadow-invary transform transition-all duration-200 hover:shadow-invary-lg hover:-translate-y-1"
                >
                  Launch Dashboard
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Clean Metrics Grid */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16 transition-all duration-700 delay-800 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              {systemHealth.map((metric, index) => {
                const colors = getStatusColor(metric.status);
                const circumference = 2 * Math.PI * 40;
                const strokeDasharray = `${(metric.value / 100) * circumference} ${circumference}`;
                
                return (
                  <div key={metric.name} className="group relative">
                    <div className="bg-white dark:bg-invary-secondary/10 border border-gray-200 dark:border-invary-secondary/20 rounded-xl p-6 hover:border-invary-accent/50 transition-all duration-300 hover:shadow-invary">
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">{metric.icon}</span>
                        <div className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-invary-secondary/20 text-invary-neutral dark:text-gray-400">
                          {metric.trend}
                        </div>
                      </div>

                      {/* Simple Progress Circle */}
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="text-gray-200 dark:text-invary-secondary/30"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            className="text-invary-accent"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={strokeDasharray}
                            strokeLinecap="round"
                            style={{
                              transition: 'stroke-dasharray 1s ease-in-out',
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-invary-primary dark:text-white">
                            {Math.round(metric.value)}%
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-invary-primary dark:text-white font-medium text-center">{metric.name}</h3>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clean Summary Card */}
            <div className={`radial-gradient-bg rounded-xl p-6 border border-gray-200 dark:border-invary-secondary/20 mb-16 transition-all duration-700 delay-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-invary-accent rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-invary-primary dark:text-white font-semibold mb-1">Operations Summary</div>
                  <div className="text-invary-neutral dark:text-gray-300">
                    <span className="text-green-600 dark:text-green-400 font-medium">Deployments stable.</span> No critical alerts. 
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Cost optimization available.</span>
                  </div>
                </div>
                <div className="text-invary-neutral dark:text-gray-400 text-sm">
                  {currentTime.toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Clean Feature Cards */}
            <div className={`grid md:grid-cols-3 gap-6 transition-all duration-700 delay-1200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              {[
                {
                  title: 'Dashboard',
                  description: 'Real-time monitoring with intelligent insights',
                  href: '/dashboard',
                  icon: '📊',
                  badge: 'Live'
                },
                {
                  title: 'Infrastructure',
                  description: 'Comprehensive infrastructure monitoring and management',
                  href: '/infrastructure',
                  icon: '🏗️',
                  badge: 'Core'
                },
                {
                  title: 'Analytics',
                  description: 'Advanced analytics and performance insights',
                  href: '/reports',
                  icon: '📈',
                  badge: 'Premium'
                }
              ].map((feature, index) => (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group relative bg-white dark:bg-invary-secondary/10 border border-gray-200 dark:border-invary-secondary/20 rounded-xl p-6 hover:border-invary-accent/50 transition-all duration-300 hover:shadow-invary"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{feature.icon}</div>
                    <div className="px-2 py-1 text-xs font-medium rounded bg-invary-accent/10 text-invary-accent">
                      {feature.badge}
                    </div>
                  </div>
                  
                  <h3 className="text-invary-primary dark:text-white font-semibold text-lg mb-3 group-hover:text-invary-accent transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-invary-neutral dark:text-gray-300 leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  
                  <div className="flex items-center text-invary-accent font-medium group-hover:translate-x-1 transition-transform duration-300">
                    <span>Explore</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
