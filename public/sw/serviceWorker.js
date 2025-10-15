

const CACHE_NAME = "offline-cache-v1";
const urlsToCache = ["/", "/index.html", "/main.js", "/index.css"]; // precache app shell

self.addEventListener("install", (event) => {
console.log("[SW] Installing...");
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
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
.catch(() => {
// When offline, return the cached index.html (SPA shell)
// This ensures React Router can handle the routing
return caches.match("/index.html").then((cachedResponse) => {
if (cachedResponse) {
return cachedResponse;
}
// Fallback to root
return caches.match("/");
});
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

