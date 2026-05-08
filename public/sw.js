const CACHE_NAME = "maeng-studio-v1";
const ASSETS_TO_CACHE = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          const requestUrl = new URL(event.request.url);
          const isSameOrigin = requestUrl.origin === self.location.origin;
          const isStaticAsset = isSameOrigin && (
            requestUrl.pathname.startsWith("/_next/static") ||
            requestUrl.pathname.startsWith("/icon") ||
            requestUrl.pathname.startsWith("/apple-icon")
          );

          if (networkResponse.ok && isStaticAsset) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
          }

          return networkResponse;
        })
        .catch(() => caches.match("/"));
    })
  );
});
