// Add PWA install prompt handling
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('Service Worker: beforeinstallprompt event received');
  // This won't be called here, but in the main thread
});

// Handle successful PWA installation
self.addEventListener('appinstalled', (event) => {
  console.log('Service Worker: App was installed');
});

const CACHE_NAME = 'bizops360-crm-v1.0.0';
const STATIC_CACHE = 'bizops360-static-v1.0.0';
const DYNAMIC_CACHE = 'bizops360-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json'
];

// API endpoints that should be cached for all modules
const API_CACHE_PATTERNS = [
  // CRM Module APIs
  '/api/customers/list.php',
  '/api/spares/list.php',
  '/api/email/recipients.php',
  '/api/reports/',
  '/api/leads/',
  '/api/contacts/',
  '/api/opportunities/',
  '/api/quotations/',
  '/api/invoices/',
  '/api/activities/',

  // Technical Module APIs
  '/api/service/',
  '/api/technicians/',
  '/api/scale-history/',
  '/api/spares/',

  // Warehouse Module APIs
  '/api/warehouse/',
  '/api/inventory/',
  '/api/stock/',
  '/api/spare-parts/',

  // Admin Module APIs
  '/api/users/',
  '/api/admin/',
  '/api/analytics/',
  '/api/approvals/',
  '/api/location-tracking/',

  // Common APIs
  '/api/auth/',
  '/api/dashboard/',
  '/api/settings/'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Always try network first for API calls
    const networkResponse = await fetch(request);

    // Cache successful GET requests for specific endpoints
    if (request.method === 'GET' && networkResponse.ok) {
      const shouldCache = API_CACHE_PATTERNS.some(pattern =>
        url.pathname.includes(pattern)
      );

      if (shouldCache) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', url.pathname);

    // If network fails, try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Return offline page for failed requests
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Offline - Please check your internet connection',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static files with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch', request.url);

    // Return offline fallback
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/index.html');
    }

    return new Response('Offline', { status: 503 });
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'sync-crm-data') {
    event.waitUntil(syncOfflineCRMData());
  }
});

// Sync offline CRM data when connection is restored
async function syncOfflineCRMData() {
  try {
    // Get offline data from IndexedDB for all modules
    const offlineData = await getOfflineCRMData();

    for (const data of offlineData) {
      try {
        let endpoint = '';
        switch (data.type) {
          case 'report':
            endpoint = '/api/reports/create.php';
            break;
          case 'lead':
            endpoint = '/api/leads/create.php';
            break;
          case 'contact':
            endpoint = '/api/contacts/create.php';
            break;
          case 'opportunity':
            endpoint = '/api/opportunities/create.php';
            break;
          case 'quotation':
            endpoint = '/api/quotations/create.php';
            break;
          case 'invoice':
            endpoint = '/api/invoices/create.php';
            break;
          case 'activity':
            endpoint = '/api/activities/create.php';
            break;
          default:
            continue;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`
          },
          body: JSON.stringify(data.payload)
        });

        if (response.ok) {
          await removeOfflineCRMData(data.id);
          console.log('Service Worker: Synced offline data', data.type, data.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync data', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Helper functions for offline storage
async function getOfflineCRMData() {
  // Implementation would use IndexedDB
  return [];
}

async function removeOfflineCRMData(id) {
  // Implementation would remove from IndexedDB
  console.log('Removing offline data', id);
}