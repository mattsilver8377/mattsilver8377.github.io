// WingCast Service Worker v32 - Firebase Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'wingcast-v32';
const BASE = '/Wingcast';

// Firebase config — must match index.html
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
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background push received:', payload);
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'WingCast Wind Alert 🏄', {
    body: body || 'Conditions look good at your spot!',
    icon: icon || BASE + '/icons/icon-192x192.png',
    badge: BASE + '/icons/icon-96x96.png',
    tag: 'wingcast-alert',
    renotify: true,
    data: { url: 'https://mattsilver8377.github.io/Wingcast/' },
    actions: [
      { action: 'view', title: 'View Forecast' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || 'https://mattsilver8377.github.io/Wingcast/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('Wingcast') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([BASE + '/manifest.json']).catch(() => {})
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
  if (url.pathname.endsWith('.html') || url.pathname === BASE + '/' || url.pathname === BASE) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(BASE + '/index.html'))
    );
    return;
  }
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
