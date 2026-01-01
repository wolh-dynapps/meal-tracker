/* Meal Tracker Service Worker (single consolidated version) */

const CACHE_NAME = 'meal-tracker-v4';
const RUNTIME_CACHE = 'meal-tracker-runtime-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/browse.html',
  '/css/simple.css',
  '/js/simple.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin) return;

  // Cache-first for static assets
  if (STATIC_ASSETS.includes(url.pathname) || STATIC_ASSETS.includes(url.pathname + '/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match('/index.html')))
    );
    return;
  }

  // Network-first for other requests, fallback to cache
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
  );
});

