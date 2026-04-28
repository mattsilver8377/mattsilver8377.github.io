// WingCast Service Worker v35 - Firebase Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'wingcast-v35';

firebase.initializeApp({
  apiKey: "AIzaSyBywWIHDEloGao0lHnAISsYHvJqATzU0Q8",
  authDomain: "wingcast-59284.firebaseapp.com",
  projectId: "wingcast-59284",
  storageBucket: "wingcast-59284.firebasestorage.app",
  messagingSenderId: "638397146468",
  appId: "1:638397146468:web:d2715aa4167388d2774671",
});

const messaging = firebase.messaging();

// Handle background push messages (app closed or in background)
messaging.onBackgroundMessage(async payload => {
  console.log('[SW] Background push received:', payload);

  // If app is open in foreground, don't show a second notification
  // Remove visibilityState check — on mobile PWA the app is often backgrounded but still open
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  const appOpen = clientList.some(c => c.url.includes('wingcast.co.uk'));
  if (appOpen) {
    console.log('[SW] App window found — forwarding to in-app banner, skipping OS notification');
    clientList.forEach(c => {
      if (c.url.includes('wingcast.co.uk')) {
        try { c.postMessage({ type: 'PUSH_RECEIVED', payload }); } catch(e) {}
      }
    });
    return;
  }

  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'WingCast Wind Alert 🏄', {
    body: body || 'Conditions look good at your spot!',
    icon: icon || '/icons/icon-192x192.png',
    badge: '/notification-icon.png',
    tag: 'wingcast-alert',
    renotify: false,
    data: { url: 'https://wingcast.co.uk/' },
    actions: [
      { action: 'view', title: 'View Forecast' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
});

// Handle notification click — open or focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || 'https://wingcast.co.uk/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('wingcast.co.uk') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ==================== CACHE & FETCH ====================

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/manifest.json']).catch(() => {})
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;
  const url = new URL(event.request.url);
  if (url.hostname !== location.hostname) return;

  // Always fetch HTML fresh — never serve stale app shell
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest)
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
