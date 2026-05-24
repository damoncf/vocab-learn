/**
 * sw.js — Service Worker for VocabLearn
 *
 * Network-first for HTML/JS/CSS (always get latest if online)
 * Cache-first for vocabulary JSON and icons (rarely change)
 */

const CACHE_NAME = 'vocablearn-v2';

const PRECACHE_URLS = [
  'index.html',
  'style.css',
  'app.js',
  'storage.js',
  'onboarding.js',
  'badges.js',
  'challenge.js',
  'api.js',
  'review.js',
  'quiz.js',
  'tts.js',
  'anki.js',
  'dictation.js',
  'cloze.js',
  'sync.js',
  'reading.js',
  'practice.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vocabulary/index.json'
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
    }).then(() => self.clients.claim())
  );
});

/* =========================================================
   Fetch — hybrid strategy
   ========================================================= */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Vocabulary JSON files: cache-first (rarely change, large files)
  if (url.pathname.includes('/vocabulary/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Icons and manifest: cache-first
  if (url.pathname.includes('/icons/') || url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // HTML, JS, CSS: network-first (always get latest if online)
  event.respondWith(
    fetch(event.request).then((response) => {
      if (!response || response.status !== 200) return response;
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('index.html');
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
