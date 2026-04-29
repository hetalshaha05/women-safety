const CACHE_NAME = 'safeher-v1';

// We explicitly cache the fallback HTML for Layer 4, the manifest, fonts, and leaflet
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=Syne:wght@700;800&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Use network-first strategy, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If it's a valid response, add it to the cache to update
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache immediately
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If we fail and it's a navigation request, serve offline fallback
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html').then(offlineRes => {
              // If offline.html isn't cached (yet), we could serve index.html directly from cache
              return offlineRes || caches.match('/index.html');
            });
          }
        });
      })
  );
});
