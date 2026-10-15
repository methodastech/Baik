/* Baik service worker.
 *
 * Two rules decide everything here:
 *   1. Anything under /api/ is never cached. Sessions, premium state and payment
 *      results must always come from the server, or a signed-out browser could
 *      be shown a signed-in page from the cache.
 *   2. Navigations are network-first so a deploy is picked up immediately, with
 *      the cache only as the offline fallback. Static files are cache-first,
 *      because their contents never change under the same URL.
 */
const VERSION = 'baik-v2';   // v2: pages load css/js as ?v=<hash>; dropping v1 clears the stale copies
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

// The app has to work offline from a cold start, so its shell is precached.
const PRECACHE = [
  '/khayr',
  '/css/khayr.css',
  '/js/khayr-app.js',
  '/khayr-features.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      // addAll fails the whole install if one file 404s; add them one by one so a
      // missing extra never blocks the worker from taking over.
      .then(cache => Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // CDN and third parties: leave alone
  if (url.pathname.startsWith('/api/')) return;         // rule 1: never cache the API

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(RUNTIME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('/khayr')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(RUNTIME).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })))   // offline: any saved copy of the file
  );
});

// Lets a new deploy replace a running worker without the user closing every tab.
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
