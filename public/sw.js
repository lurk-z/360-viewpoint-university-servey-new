const CACHE_NAME = 'kmuntb-tour-v3';
const TOUR_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/tour/pano/entrance.jpg',
  '/tour/pano/balcony.jpg',
  '/tour/pano/bicycle.jpg',
  '/tour/pano/room.jpg',
  '/tour/thumbs/thumb-entrance.jpg',
  '/tour/thumbs/thumb-balcony.jpg',
  '/tour/thumbs/thumb-bicycle.jpg',
  '/tour/thumbs/thumb-room.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(TOUR_ASSETS)).then(() => self.skipWaiting()));
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
