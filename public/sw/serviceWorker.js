

const CACHE_NAME = "offline-cache-v2";
const OFFLINE_PAGE = "/offline";
const urlsToCache = [
  "/", 
  "/index.html", 
  "/main.js", 
  "/index.css",
  "/offline"
]; // precache app shell and offline page

self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Helper function to check if request is for offline page
function isOfflinePageRequest(request) {
  return request.url.includes('/offline') || 
         request.url.endsWith('/offline') ||
         request.url.includes('offline');
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Handle navigation (page reloads)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Clone and cache the response for future use
          const responseClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return res;
        })
        .catch(async () => {
          // When offline, check if we should show offline page
          const isOfflineRequest = isOfflinePageRequest(event.request);
          
          if (isOfflineRequest) {
            // Return cached offline page
            const cachedOffline = await caches.match(OFFLINE_PAGE);
            if (cachedOffline) {
              return cachedOffline;
            }
          }
          
          // Check if we have a cached version of the requested page
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Fallback to index.html for SPA routing
          const fallbackResponse = await caches.match("/index.html");
          if (fallbackResponse) {
            return fallbackResponse;
          }
          
          // Last resort - return cached root
          return caches.match("/");
        })
    );
    return;
  }

  // For static assets (CSS, JS, images, etc.)
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cache static assets
        const responseClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

