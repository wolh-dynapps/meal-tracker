/* Meal Tracker Service Worker v11 - GitHub Pages compatible */

const CACHE_NAME = 'meal-tracker-v14';
const RUNTIME_CACHE = 'meal-tracker-runtime-v14';

// Get base path from service worker location
const SW_PATH = self.location.pathname;
const BASE_PATH = SW_PATH.substring(0, SW_PATH.lastIndexOf('/') + 1);

const STATIC_FILES = [
  'index.html',
  'browse.html',
  'css/simple.css',
  'js/simple.js',
  'manifest.json',
  'ciqual/ciqual_index.json'
];

const STATIC_ASSETS = STATIC_FILES.map(f => BASE_PATH + f);
STATIC_ASSETS.push(BASE_PATH); // Add root path

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

  // Check if this is a static asset
  const isStatic = STATIC_ASSETS.some(asset =>
    url.pathname === asset || url.pathname === asset.replace('index.html', '')
  );

  if (isStatic) {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => caches.match(BASE_PATH + 'index.html')))
    );
    return;
  }

  // Network-first for other requests (like JSON data), fallback to cache
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match(BASE_PATH + 'index.html')))
  );
});
