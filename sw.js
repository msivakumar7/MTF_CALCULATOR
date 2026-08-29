const CACHE_NAME = 'mtf-calc-v6';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './calc.js',
  './data.js',
  './manifest.json',
  './assets/logo.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('Cache addAll failed for some resources:', err);
          // Cache resources individually so one failure doesn't block all
          return Promise.allSettled(
            urlsToCache.map(url => cache.add(url).catch(() => {}))
          );
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(fetchResponse => {
          // Don't cache non-ok responses or opaque responses from CDNs
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }
          // Cache successful responses for future offline use
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        });
      })
      .catch(() => {
        // If both cache and network fail, return a basic offline response
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});
