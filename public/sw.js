const CACHE_NAME = 'kmuntb-tour-v4';
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg'
];

async function getTourAssets() {
  try {
    const response = await fetch('/api/tour-assets', { cache: 'no-store' });
    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data.assets) ? data.assets : [];
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => cache.addAll([...SHELL_ASSETS, ...await getTourAssets()]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
