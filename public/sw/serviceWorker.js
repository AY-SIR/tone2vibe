const CACHE_NAME = "site-cache-v1";

// List of files to cache
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/main.js",
  "/logo.png" // Add other assets you want cached
];

// Install event – caching files
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event – cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event – serve cache when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Optional: update cache with latest response
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request) || caches.match("/"))
  );
});
