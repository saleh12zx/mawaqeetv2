/* عامل الخدمة: يجعل التطبيق يعمل بدون إنترنت ويحدّث نفسه في الخلفية */
const VERSION = 'v1.0.0';
const CACHE = `mawaqeet-${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/adhan.min.js',
  'js/cities.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.png',
  'icons/badge-96.png',
  'fonts/tajawal-arabic-400-normal.woff2',
  'fonts/tajawal-arabic-500-normal.woff2',
  'fonts/tajawal-arabic-700-normal.woff2',
  'fonts/tajawal-arabic-800-normal.woff2',
  'fonts/tajawal-latin-400-normal.woff2',
  'fonts/tajawal-latin-500-normal.woff2',
  'fonts/tajawal-latin-700-normal.woff2',
  'fonts/tajawal-latin-800-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mawaqeet-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// من الذاكرة أولاً ثم تحديث النسخة في الخلفية (stale-while-revalidate)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req)
      .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') {
      const shell = (await cache.match('index.html')) || (await cache.match('./'));
      if (shell) return shell;
    }
    return new Response('', { status: 504, statusText: 'offline' });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});
