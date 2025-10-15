const CACHE_NAME = "offline-page-cache-v1";

// Only cache the Offline route
const urlsToCache = ["/offline"];

self.addEventListener("install", (event: ExtendableEvent) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .catch(() =>
        // On network failure, return cached Offline route
        caches.match("/offline")
      )
  );
});
