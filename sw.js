/* ==========================================================================
   CREATIO SERVICE WORKER — 100% BULLETPROOF OFFLINE ENGINE (v11)
   Resilient app-shell caching, instant offline navigation & dynamic cache.
   ========================================================================== */

const CACHE_NAME = 'creatio-offline-v11';
const CORE_ASSETS = [
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

// 1. INSTALLATION: Pre-cache core shell with resilience (never fails whole install)
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[Creatio SW] Pre-caching core shell for 100% offline use...');
      const cachePromises = CORE_ASSETS.map(async url => {
        try {
          const response = await fetch(url, { cache: 'reload' });
          if (response && response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn('[Creatio SW] Asset pre-cache warning for', url, err);
        }
      });
      await Promise.allSettled(cachePromises);
      console.log('[Creatio SW] Core shell cached successfully.');
    })
  );
});

// 2. ACTIVATION: Clean up older cache generations and claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Creatio SW] Removing legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: Robust Offline Strategy
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests (e.g. POST) and browser extension schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. NAVIGATION REQUESTS (Opening the PWA HTML page / Homescreen launch)
  if (request.mode === 'navigate' || request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        // First try to serve immediately from cache if offline or for speed
        const cache = await caches.open(CACHE_NAME);
        try {
          // If online, fetch from network and update cache in background
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            cache.put('./index.html', networkResponse.clone());
            return networkResponse;
          }
        } catch (fetchErr) {
          console.log('[Creatio SW] Device offline, serving cached app shell for navigation');
        }

        // Return cached HTML (matching request URL, /index.html, or root)
        const cachedHtml = await cache.match(request, { ignoreSearch: true })
          || await cache.match('./index.html', { ignoreSearch: true })
          || await cache.match('index.html', { ignoreSearch: true })
          || await cache.match('./', { ignoreSearch: true })
          || await cache.match('/', { ignoreSearch: true });

        if (cachedHtml) {
          return cachedHtml;
        }

        // Fallback: search any HTML file in cache
        const keys = await cache.keys();
        for (const key of keys) {
          if (key.url.includes('index.html') || key.url.endsWith('/')) {
            const match = await cache.match(key);
            if (match) return match;
          }
        }

        return new Response('<html><body style="background:#000;color:#fff;text-align:center;font-family:sans-serif;padding:40px;"><h2>Creatio Offline</h2><p>Por favor, recarregue o aplicativo quando conectado para ativar o cache offline.</p></body></html>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // B. STATIC ASSETS (CSS, JS, Images, Fonts, Icons)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Check cache first (with ignoreSearch for version queries like styles.css?v=2)
      const cachedResponse = await cache.match(request, { ignoreSearch: true });
      if (cachedResponse) {
        // If online, optionally revalidate in background
        if (navigator.onLine) {
          fetch(request)
            .then(res => {
              if (res && res.status === 200) {
                cache.put(request, res);
              }
            })
            .catch(() => {});
        }
        return cachedResponse;
      }

      // If not in cache, fetch from network and cache dynamically (e.g. fonts or CDN scripts)
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Fallback for missing images when offline
        if (request.destination === 'image') {
          return (await cache.match('./favicon.png')) || (await cache.match('./icon-192.png')) || new Response('', { status: 404 });
        }
        return new Response('', { status: 503, statusText: 'Offline Asset Unavailable' });
      }
    })()
  );
});
