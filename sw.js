/* Service worker for Avodat Hashem.
   Strategy:
   - HTML, CSS, JS, JSON, SVG: network-first → always serve the latest
     code; fall back to cache only when offline.
   - Fonts and other immutable assets: cache-first (long-term cache).
   - External APIs (Sefaria, HebCal, Firebase, Google, BigDataCloud):
     bypass the SW entirely (browser handles directly).
   - Navigations: network-first → fall back to cached index.html when
     offline.

   Bump CACHE_VERSION whenever you change this file so old caches are
   purged on activate. (The network-first strategy makes individual
   bumps less critical, but it keeps things tidy.)
*/
const CACHE_VERSION = 'avodat-v6';

const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) =>
      c.addAll(SHELL).catch(() => {})
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* External hosts to bypass entirely */
const BYPASS_HOSTS = [
  'sefaria.org',
  'hebcal.com',
  'gstatic.com',
  'googleapis.com',
  'firebase',
  'firebaseio.com',
  'bigdatacloud.net'
];

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* Bypass external APIs and SDKs */
  if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) return;

  /* Same-origin only from here on */
  if (url.origin !== self.location.origin) return;

  const isFont = /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);

  /* Cache-first for fonts (immutable, fingerprinted) */
  if (isFont) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached ||
        fetch(e.request).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  /* Network-first for everything same-origin (HTML, CSS, JS, JSON, SVG, icons) */
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) =>
          cached || (e.request.mode === 'navigate' ? caches.match('/index.html') : null)
        )
      )
  );
});

/* Message channel — allow the page to ask SW to skipWaiting */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
