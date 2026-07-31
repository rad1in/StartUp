/* Service worker — offline support for the QR-ordering PWA.
 *
 * Strategy:
 *  - API calls (/api/, socket.io) are never touched — always network.
 *  - Navigations: network-first, falling back to the cached shell and then
 *    the offline page when the network is down.
 *  - Static assets (scripts, styles, fonts, images, uploads): network-first
 *    with cache fallback. Network-first (instead of cache-first) keeps dev/HMR
 *    and fresh deploys working without stale-module headaches; every
 *    successful response refreshes the cache so offline still works.
 */
const CACHE = 'qr-order-v2';
const PRECACHE = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept API traffic or websockets.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) return;
  // Only handle same-origin + the backend's static uploads.
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/uploads/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/', copy));
          return res;
        })
        .catch(async () => (await caches.match('/')) || caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.destination === 'image') {
          return new Response('', { status: 404, statusText: 'offline' });
        }
        return Response.error();
      })
  );
});

// --- Web Push ---
// The payload is the plain JSON string sendPushToUser() sends server-side:
// { title, body, url, tag }.
self.addEventListener('push', (event) => {
  let data = { title: 'ET-Cafe', body: '' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    /* non-JSON payload — fall back to the defaults above */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'et-cafe',
      dir: 'rtl',
      lang: 'fa',
      data: { url: data.url || '/' },
    })
  );
});

// Focus an already-open tab on the target URL if one exists, otherwise open
// a new one — the usual "click a notification" behavior.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
