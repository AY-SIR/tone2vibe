

const CACHE_NAME = "tone2vibe-cache-v1";
const STATIC_CACHE = "tone2vibe-static-v1";

// Only cache essential files
const ESSENTIAL_URLS = [
  "/",
  "/index.html",
  "/favicon.png"
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing lightweight service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(ESSENTIAL_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return cached index.html for offline navigation
          return caches.match("/index.html");
        })
    );
  }
  
  // For API calls, always try network first
  if (event.request.url.includes('/api/') || event.request.url.includes('/functions/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        })
    );
  }
});

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

