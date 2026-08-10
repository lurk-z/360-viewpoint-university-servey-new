const CACHE_NAME = 'kmuntb-tour-v11';
const sceneCacheJobs = new Map();
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/fitm-favicon.svg',
  '/mainimages/Logo_FitM/FITM_LOGO.png',
  '/mainimages/map/mainmap1.png',
  '/api/content'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('kmuntb-tour-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, navigation = false) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(navigation ? '/' : request, response.clone());
    }
    return response;
  } catch {
    const fallback = await caches.match(navigation ? '/' : request);
    return fallback ?? Response.error();
  }
}

function isSceneAsset(url) {
  const parsed = new URL(url, self.location.origin);
  return parsed.origin === self.location.origin
    && /^\/mainimages\/[^/]+\.jpe?g$/i.test(parsed.pathname);
}

async function cacheSceneAssets(sceneId, assets) {
  if (sceneCacheJobs.has(sceneId)) return sceneCacheJobs.get(sceneId);

  const job = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const urls = [...new Set(assets)].filter(isSceneAsset);
    for (const url of urls) {
      const request = new Request(url, { credentials: 'same-origin' });
      if (await cache.match(request)) continue;
      const response = await fetch(request);
      if (!response.ok) throw new Error(`Unable to cache ${url}`);
      await cache.put(request, response);
    }
  })().finally(() => sceneCacheJobs.delete(sceneId));

  sceneCacheJobs.set(sceneId, job);
  return job;
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_SCENE_ASSETS'
    || typeof event.data.sceneId !== 'string'
    || !Array.isArray(event.data.assets)) return;

  event.waitUntil(cacheSceneAssets(event.data.sceneId, event.data.assets)
    .then(() => event.source?.postMessage({
      type: 'SCENE_ASSETS_CACHED',
      sceneId: event.data.sceneId
    }))
    .catch(() => undefined));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, true));
    return;
  }

  const isTourImage = url.pathname.startsWith('/mainimages/')
    && /\.(?:jpe?g|png)$/i.test(url.pathname);

  event.respondWith(isTourImage
    ? cacheFirst(event.request)
    : networkFirst(event.request));
});
