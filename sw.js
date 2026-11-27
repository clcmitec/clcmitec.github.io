const CACHE_NAME = "mitec-cl-pwa-v3";

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./booking.html",
  "./signin.html",
  "./hub.html",
  "./history.html",
  "./profile.html",
  "./manifest.json"
];

// Install: Cache core HTML shell files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        APP_SHELL_FILES.map((url) => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: Bypass live APIs; Network-First for HTML; Cache-First for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept Google Apps Script, Firestore, or Google Analytics calls
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("script.googleusercontent.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("googletagmanager.com")
  ) {
    return;
  }

  // Network-First for HTML navigation requests (ensures latest code & live data)
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return networkRes;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./dashboard.html")))
    );
    return;
  }

  // Cache-First with background update for CSS, JS, fonts, and logos
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
