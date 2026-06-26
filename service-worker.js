/* ================================
   Service Worker - Pistachio App
   ================================ */

const CACHE_NAME = "pistachio-ledger-v2.2";

const HTML2PDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

const CORE_ASSETS = [
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

const OPTIONAL_ASSETS = [
  HTML2PDF_CDN
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll(CORE_ASSETS);

      await Promise.allSettled(
        OPTIONAL_ASSETS.map((asset) => cache.add(asset))
      );
    })()
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })()
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const networkResponse = await fetch(request);

        if (
          networkResponse &&
          networkResponse.ok &&
          (url.origin === self.location.origin || request.url === HTML2PDF_CDN)
        ) {
          await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (request.url === HTML2PDF_CDN) {
          const cdnResponse = await cache.match(HTML2PDF_CDN);
          if (cdnResponse) {
            return cdnResponse;
          }
        }

        if (request.mode === "navigate") {
          if (url.pathname.endsWith("/customer-ledger.html")) {
            const page = await cache.match("./customer-ledger.html");
            if (page) {
              return page;
            }
          }

          if (url.pathname.endsWith("/customers.html")) {
            const page = await cache.match("./customers.html");
            if (page) {
              return page;
            }
          }

          const homePage = await cache.match("./index.html");
          if (homePage) {
            return homePage;
          }
        }

        return Response.error();
      }
    })()
  );
});
