// sw.js

const CACHE_NAME = "spa-offline-cache-v1";

// Files to precache (offline page + SPA shell)
const PRECACHE_URLS = [
  "/index.html",   // SPA shell
  "/offline.html", // Optional: your custom offline page
];

// Install event: precache index.html
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event: offline handling
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // 1️⃣ Navigation requests (React Router SPA)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Optionally cache the navigation response dynamically
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => {
          // Offline: show SPA shell or custom offline page
          return caches.match("/offline.html").then((offlineRes) => {
            return offlineRes || caches.match("/index.html");
          });
        })
    );
    return;
  }

  // 2️⃣ Static assets (JS, CSS, images)
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
