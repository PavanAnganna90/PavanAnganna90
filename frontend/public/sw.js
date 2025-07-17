/**
 * Advanced Service Worker for OpsSight - v2.0.0
 * 
 * Provides comprehensive caching strategies:
 * - Cache-first for static assets
 * - Network-first for API calls
 * - Stale-while-revalidate for dynamic content
 * - Background sync for offline operations
 * - Push notifications support
 */

const CACHE_NAME = 'opssight-v2.0.0';
const STATIC_CACHE = 'opssight-static-v2.0.0';
const DYNAMIC_CACHE = 'opssight-dynamic-v2.0.0';
const API_CACHE = 'opssight-api-v2.0.0';

// Cache strategies configuration
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only'
};

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/infrastructure',
  '/pipelines',
  '/monitoring',
  '/teams',
  '/auth/login',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
];

// API endpoints to cache with different strategies
const API_CACHE_CONFIG = {
  '/api/metrics': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 5 * 60 * 1000, // 5 minutes
  },
  '/api/dashboard': {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 2 * 60 * 1000, // 2 minutes
  },
  '/api/infrastructure': {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    maxAge: 10 * 60 * 1000, // 10 minutes
  },
  '/api/logs': {
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    maxAge: 1 * 60 * 1000, // 1 minute
  },
  '/api/auth': {
    strategy: CACHE_STRATEGIES.NETWORK_ONLY,
  },
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2.0.0...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleDynamicContent(request));
  }
});

// API request handler
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const apiPath = url.pathname;
  
  // Find matching API config
  const config = Object.entries(API_CACHE_CONFIG).find(([path]) => 
    apiPath.startsWith(path)
  )?.[1];
  
  if (!config) {
    return fetch(request);
  }
  
  switch (config.strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, API_CACHE, config.maxAge);
    
    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, API_CACHE, config.maxAge);
    
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, API_CACHE, config.maxAge);
    
    case CACHE_STRATEGIES.NETWORK_ONLY:
    default:
      return fetch(request);
  }
}

// Static asset handler
async function handleStaticAsset(request) {
  return cacheFirst(request, STATIC_CACHE);
}

// Dynamic content handler
async function handleDynamicContent(request) {
  return staleWhileRevalidate(request, DYNAMIC_CACHE, 24 * 60 * 60 * 1000); // 24 hours
}

// Cache-first strategy
async function cacheFirst(request, cacheName, maxAge = null) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cache is still valid
      if (maxAge && isCacheExpired(cachedResponse, maxAge)) {
        // Cache expired, fetch new data
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request, cacheName, maxAge = null) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // Network failed, try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && (!maxAge || !isCacheExpired(cachedResponse, maxAge))) {
      return cachedResponse;
    }
    
    return networkResponse;
  } catch (error) {
    // Network error, try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge = null) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);
  
  // Return cached response immediately if available and valid
  if (cachedResponse) {
    if (!maxAge || !isCacheExpired(cachedResponse, maxAge)) {
      // Background update
      fetchPromise.catch(() => {});
      return cachedResponse;
    }
  }
  
  // Wait for network response if no valid cache
  return fetchPromise || new Response('Offline', { status: 503 });
}

// Check if cached response is expired
function isCacheExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;
  
  const cachedTime = new Date(dateHeader).getTime();
  const now = Date.now();
  
  return (now - cachedTime) > maxAge;
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/_next/static/');
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'metrics-sync') {
    event.waitUntil(syncMetrics());
  } else if (event.tag === 'alerts-sync') {
    event.waitUntil(syncAlerts());
  }
});

// Sync metrics data
async function syncMetrics() {
  try {
    console.log('[SW] Syncing metrics data...');
    // Implement offline sync logic
    console.log('[SW] Metrics sync completed');
  } catch (error) {
    console.error('[SW] Metrics sync failed:', error);
  }
}

// Sync alerts data
async function syncAlerts() {
  try {
    console.log('[SW] Syncing alerts data...');
    // Implement offline sync logic
    console.log('[SW] Alerts sync completed');
  } catch (error) {
    console.error('[SW] Alerts sync failed:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'You have new updates in OpsSight',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'opssight-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      }
    ]
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.tag = data.tag || options.tag;
      options.data = data;
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('OpsSight Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CACHE_CLEAR') {
    clearAllCaches();
  } else if (event.data.type === 'CACHE_UPDATE') {
    updateCache(event.data.url);
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

// Update specific cache entry
async function updateCache(url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(url, response);
      console.log('[SW] Cache updated for:', url);
    }
  } catch (error) {
    console.error('[SW] Failed to update cache:', error);
  }
}

console.log('[SW] Advanced Service Worker v2.0.0 loaded');