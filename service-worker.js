/* ================================
   Service Worker - Pistachio App
   Version: 1.1
   ================================ */

const CACHE_NAME = "pistachio-ledger-v1.3"; 

const ASSETS = [
  "./",
  "./index.html",
  "./customers.html",
  "./customers-ledger.html",
  "./style.css",
  "./app.js",
  "./ledger.js",
  "./utils.js", // حتماً فایل جدید را اینجا اضافه کن
  "./db.js",
  "./backup.js",
  "./manifest.json",
  "./icons/iconapp192.png",
  "./icons/iconapp512.png"
];

function isHttpRequest(request) {
  return request.url.startsWith("http://") || request.url.startsWith("https://");
}

function isSameOriginRequest(request) {
  try {
    const requestUrl = new URL(request.url);
    return requestUrl.origin === self.location.origin;
  } catch (error) {
    return false;
  }
}

function canHandleRequest(request) {
  if (!request) return false;
  if (request.method !== "GET") return false;
  if (!isHttpRequest(request)) return false;
  if (!isSameOriginRequest(request)) return false;
  return true;
}

function canCacheResponse(response) {
  if (!response) return false;
  if (response.status !== 200) return false;
  if (response.type !== "basic") return false;
  return true;
}

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
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// استراتژی شبکه اول (Network First) برای آپدیت سریع‌تر
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (!canHandleRequest(request)) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (canCacheResponse(networkResponse)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.mode === "navigate") return caches.match("./index.html");
        });
      })
  );
});
