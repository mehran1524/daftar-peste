/* ================================
   Service Worker - Pistachio App
   Offline Only Cache Strategy
   ================================ */

const CACHE_NAME = "pistachio-ledger-v2.4";

const HTML2PDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

const APP_ASSETS = [
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
  "./icons/iconapp512.png",
  HTML2PDF_CDN
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_ASSETS);
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

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      if (request.url === HTML2PDF_CDN) {
        const cdnResponse = await caches.match(HTML2PDF_CDN);
        if (cdnResponse) {
          return cdnResponse;
        }
      }

      if (request.mode === "navigate") {
        if (request.url.includes("customer-ledger.html")) {
          const page = await caches.match("./customer-ledger.html");
          if (page) return page;
        }

        if (request.url.includes("customers.html")) {
          const page = await caches.match("./customers.html");
          if (page) return page;
        }

        const homePage = await caches.match("./index.html");
        if (homePage) return homePage;
      }

      return new Response("Offline - file not found in cache", {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    })()
  );
});
