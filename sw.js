/* Service worker for Avodat Hashem — caches the app shell for fast
   reloads and offline first-load. API calls (sefaria, hebcal,
   gstatic firebase, googleapis) always pass through to the network. */
const CACHE_VERSION = 'avodat-v3';
const SHELL = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/sync.js',
  '/js/firebase-config.js',
  '/js/firebase.js',
  '/js/auth.js',
  '/js/hebrew-cal.js',
  '/js/tehilim.js',
  '/js/sefaria.js',
  '/js/tracker.js',
  '/js/charts.js',
  '/js/reader.js',
  '/js/onboarding.js',
  '/js/app.js',
  '/icons/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) =>
      c.addAll(SHELL).catch(() => {}) // tolerate missing files during dev
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Always go to network for APIs and Firebase
  if (
    url.hostname.includes('sefaria.org')   ||
    url.hostname.includes('hebcal.com')    ||
    url.hostname.includes('gstatic.com')   ||
    url.hostname.includes('googleapis.com')||
    url.hostname.includes('firebaseio.com')||
    url.hostname.includes('firebase')
  ) return; // default network behavior

  if (e.request.method !== 'GET') return;

  // Network-first for HTML (so users always get the latest UI)
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static shell (fonts, CSS, JS)
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
    )
  );
});
