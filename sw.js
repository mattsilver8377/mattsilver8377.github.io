// WingCast Service Worker v31 - GitHub Pages compatible
const CACHE_NAME = 'wingcast-v31';
const BASE = '/Wingcast';

self.addEventListener('install', event => {
  self.skipWaiting(); // Take over immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([BASE + '/manifest.json']).catch(() => {})
      // Note: intentionally NOT caching index.html so it always loads fresh
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // Take control of all open pages immediately
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  const url = new URL(event.request.url);

  // Never intercept external API calls — let browser handle natively
  if (url.hostname !== location.hostname) {
    return;
  }

  // Always fetch HTML fresh from network
  if (url.pathname.endsWith('.html') || url.pathname === BASE + '/' || url.pathname === BASE) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(BASE + '/index.html'))
    );
    return;
  }

  // Cache first for static assets (icons, manifest)
  event.respondWith(
    caches.match(event.request).then(cached => cached ||
      fetch(event.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => null)
    )
  );
});
