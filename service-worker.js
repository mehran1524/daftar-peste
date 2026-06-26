/* ================================
   Service Worker - Pistachio App
   ================================ */

const CACHE_NAME = "pistachio-ledger-v1.8";

const ASSETS = [
  "./",
  "./index.html",
  "./customers.html",
  "./customer-ledger.html",
  "./style.css",
  "./app.js",
  "./ledger.js",
  "./utils.js",
  "./db.js",
  "./backup.js",
  "./manifest.json",
  "./icons/iconapp192.png",
  "./icons/iconapp512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      if (event.request.mode === "navigate") {
        if (url.pathname.endsWith("/customer-ledger.html")) {
          return caches.match("./customer-ledger.html");
        }

        if (url.pathname.endsWith("/customers.html")) {
          return caches.match("./customers.html");
        }

        return caches.match("./index.html");
      }

      return Response.error();
    })
  );
});
