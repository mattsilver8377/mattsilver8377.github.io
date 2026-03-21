// WingCast Service Worker v27
const CACHE_NAME = 'wingcast-v28';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    // Only delete OLD caches, not current one
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.startsWith('chrome-extension')) return;

  // Always fetch HTML fresh from network
  if (url.endsWith('.html') || url.endsWith('/') || url === self.location.origin + '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache first for everything else (icons, fonts etc)
  event.respondWith(
    caches.match(event.request).then(cached => cached ||
      fetch(event.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => null)
    )
  );
});
