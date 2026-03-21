// WingCast Service Worker v28
const CACHE_NAME = 'wingcast-v28';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network only — never cache anything
// This ensures the app always loads fresh
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;
  event.respondWith(fetch(event.request).catch(() => null));
});
