// WingCast Service Worker
// Caches all assets for full offline use

const CACHE_NAME = 'wingcast-v17';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@300;400;600&family=Barlow+Condensed:wght@300;400;600;700&display=swap',
];

// Install: cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[WingCast SW] Caching assets');
      // Cache local assets reliably; external fonts best-effort
      return cache.addAll(['./index.html', './manifest.json'])
        .then(() => cache.addAll(ASSETS.filter(a => a.startsWith('http'))).catch(() => {}));
    }).then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first, fall back to network, update cache
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        // Cache fresh responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      // Return cached immediately if available, otherwise wait for network
      return cached || networkFetch;
    })
  );
});

// Background sync message
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
