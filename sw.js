/* ==========================================================================
   FITLOG SERVICE WORKER — 100% OFFLINE CACHING
   ========================================================================== */

const CACHE_NAME = 'fitlog-cache-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png',
  './js/seed-data.js',
  './js/db.js',
  './js/timer.js',
  './js/backup.js',
  './js/pdf-parser.js',
  './js/ai-assistant.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching app shell v5');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
