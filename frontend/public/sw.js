/* eslint-disable no-restricted-globals */
/**
 * Lightweight service worker: cache-first for versioned static assets,
 * network-first for navigations. Keeps repeat visits snappy without
 * serving stale HTML shells.
 */
const CACHE_NAME = "dobbelen-assets-v1";
const ASSET_EXT = /\.(?:js|css|woff2?|ttf|eot|png|jpe?g|gif|svg|webp|wav|mp3|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API or WebSocket traffic
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/ws")) return;

  const isNavigation = request.mode === "navigate" || request.destination === "document";
  const isAsset = ASSET_EXT.test(url.pathname);

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          const cached = await caches.match("/index.html");
          return cached || Response.error();
        })
    );
    return;
  }

  if (!isAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        // Revalidate in background
        fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
          })
          .catch(() => {});
        return cached;
      }
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })()
  );
});
