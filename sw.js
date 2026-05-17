/**
 * sw.js — Service Worker for VocabLearn v2.0
 *
 * Cache-first strategy: all core files are pre-cached at install time.
 * Offline-first loading for cached resources.
 */

const CACHE_NAME = 'vocablearn-v1';

const PRECACHE_URLS = [
  'index.html',
  'style.css',
  'app.js',
  'storage.js',
  'api.js',
  'review.js',
  'quiz.js',
  'tts.js',
  'reading.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vocabulary/index.json',
  'vocabulary/cet4.json',
  'vocabulary/cet6.json',
  'vocabulary/ielts.json',
  'vocabulary/toefl.json',
  'vocabulary/gre.json'
];

/* =========================================================
   Install — pre-cache core files
   ========================================================= */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately without waiting for page reload
  self.skipWaiting();
});

/* =========================================================
   Activate — clean up old caches
   ========================================================= */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

/* =========================================================
   Fetch — cache-first, network fallback
   ========================================================= */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Not in cache — fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful, same-origin responses
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clone the response before caching (responses are single-use)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Both cache and network failed — return a fallback
        // For navigation requests, try to return the cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
