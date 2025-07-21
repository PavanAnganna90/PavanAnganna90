'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigationPermissions } from '../hooks/usePermissions';
import { PermissionGuard } from './rbac/PermissionGuard';
import RealTimeIndicator from './realtime/RealTimeIndicator';
import NotificationCenter from './realtime/NotificationCenter';
import { useRealTimeNotifications } from '../hooks/useRealTimeData';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const pathname = usePathname();
  const navPerms = useNavigationPermissions();
  const { unreadCount } = useRealTimeNotifications();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide/show logic (like macOS dock) - disabled on mobile when menu is open
      if (!isMobileMenuOpen) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false); // Scrolling down & past 100px
        } else {
          setIsVisible(true); // Scrolling up or at top
        }
      }
      
      setIsScrolled(currentScrollY > 10);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Navigation items with permission requirements
  const allNavItems = [
    { 
      href: '/', 
      label: 'Home', 
      show: true, // Always show home
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ) 
    },
    { 
      href: '/dashboard', 
      label: 'Dashboard',
      show: navPerms.canViewDashboard,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ) 
    },
    { 
      href: '/infrastructure', 
      label: 'Infrastructure',
      show: navPerms.canViewInfrastructure,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ) 
    },
    { 
      href: '/pipelines', 
      label: 'Pipelines',
      show: navPerms.canViewPipelines,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ) 
    },
    { 
      href: '/automation', 
      label: 'Automation',
      show: navPerms.canViewAutomation,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ) 
    },
    { 
      href: '/collaboration', 
      label: 'Collaboration',
      show: navPerms.canViewTeams,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ) 
    },
    { 
      href: '/teams', 
      label: 'Teams',
      show: navPerms.canViewTeams,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) 
    },
    { 
      href: '/monitoring', 
      label: 'Monitoring',
      show: navPerms.canViewMonitoring,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ) 
    },
    { 
      href: '/admin', 
      label: 'Admin',
      show: navPerms.canViewAdmin,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ) 
    },
    { 
      href: '/cost-analytics', 
      label: 'Cost Analytics',
      show: navPerms.canViewReports,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) 
    },
    { 
      href: '/logs', 
      label: 'Logs',
      show: navPerms.canViewLogs,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ) 
    },
    { 
      href: '/reports', 
      label: 'Reports',
      show: navPerms.canViewReports,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ) 
    },
  ];

  // Filter nav items based on permissions
  const navItems = allNavItems.filter(item => item.show);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          isScrolled || isMobileMenuOpen
            ? 'bg-white/95 dark:bg-invary-primary/95 backdrop-blur-md border-b border-gray-200/50 dark:border-invary-secondary/30 shadow-sm' 
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Left: Minimal Logo */}
            <Link 
              href="/" 
              className="flex items-center space-x-2 sm:space-x-3 group"
              aria-label="OpsSight home page"
            >
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 bg-invary-accent rounded-md flex items-center justify-center group-hover:scale-105 transition-transform duration-200"
                aria-hidden="true"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold text-invary-primary dark:text-white hidden xs:block">
                OpsSight
              </span>
            </Link>

            {/* Center: Navigation Items - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-1" role="menubar">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={`group relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-white bg-invary-accent'
                      : 'text-invary-primary dark:text-gray-300 hover:text-white hover:bg-invary-primary/80'
                  }`}
                  role="menuitem"
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  aria-label={`Navigate to ${item.label} page`}
                >
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right: Actions - Responsive sizing */}
            <div className="flex items-center space-x-2">
              
              {/* Contact/CTA Button */}
              <button 
                className="hidden md:block px-4 py-2 text-sm font-medium text-white bg-invary-accent hover:opacity-90 rounded-lg transition-all duration-200"
                aria-label="Contact us"
                type="button"
              >
                Contact
              </button>

              {/* Mobile Menu Button */}
              <button 
                onClick={handleMobileMenuToggle}
                className="lg:hidden p-2 text-invary-primary dark:text-gray-300 hover:text-invary-accent rounded-lg transition-all duration-200 touch-manipulation"
                aria-label="Toggle mobile menu"
              >
                <svg 
                  className={`w-5 h-5 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ease-in-out ${
          isMobileMenuOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Background overlay */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Slide-out menu */}
        <div 
          className={`absolute top-14 sm:top-16 left-0 right-0 bg-white/98 dark:bg-invary-primary/98 backdrop-blur-md border-b border-gray-200/50 dark:border-invary-secondary/30 shadow-lg transition-transform duration-300 ease-out ${
            isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="px-4 sm:px-6 py-6 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
            
            {/* Navigation Items */}
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 touch-manipulation ${
                    isActive(item.href)
                      ? 'text-white bg-invary-accent'
                      : 'text-invary-primary dark:text-gray-300 hover:text-white hover:bg-invary-primary/80'
                  }`}
                >
                  <span className="font-medium text-base">{item.label}</span>
                  {item.external && (
                    <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </Link>
              ))}
            </div>

            {/* Contact Button for Mobile */}
            <div className="pt-4 border-t border-gray-200/50 dark:border-invary-secondary/30">
              <button className="w-full px-4 py-3 text-sm font-medium text-white bg-invary-accent hover:opacity-90 rounded-lg transition-all duration-200">
                Contact
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </>
  );
}
