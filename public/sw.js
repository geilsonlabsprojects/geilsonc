const CACHE_NAME = "hub-ia-v1";
const RUNTIME_CACHE = "hub-ia-runtime";
const ASSETS_TO_CACHE = ["/", "/index.html"];

// Install event: cache essentials
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE).catch(() => {
          // Some assets might not be available during installation
          console.log("Some assets failed to cache during install");
        });
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event: network-first for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // API responses can contain private chat, image and account data. Never cache them.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp)$/i) ||
    url.pathname.startsWith("/_")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      }),
    );
    return;
  }

  // HTML pages: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) return response;
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback to home page
          return caches.match("/");
        });
      }),
  );
});

// Background sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        // Sync pending messages when back online
        return cache.match("/api/sync-pending").then((response) => {
          if (response) return response;
        });
      }),
    );
  }
});
