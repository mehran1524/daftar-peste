const CACHE_NAME = "pistachio-ledger-v4";

const ASSETS = [
  "./",
  "./index.html",
  "./customers.html",
  "./style.css",
  "./app.js",
  "./db.js",
  "./backup.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
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

  // فقط پاسخ‌های معمولی سایت خودمان کش شوند
  if (response.type !== "basic") return false;

  return true;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachePromises = ASSETS.map(async (asset) => {
        try {
          const request = new Request(asset, {
            cache: "reload"
          });

          const response = await fetch(request);

          if (canCacheResponse(response)) {
            await cache.put(request, response);
          }
        } catch (error) {
          // اگر یک فایل مثل آیکون وجود نداشت، نصب سرویس‌ورکر متوقف نشود
          console.warn("Service Worker: Asset not cached:", asset);
        }
      });

      await Promise.allSettled(cachePromises);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const deleteOldCaches = keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key));

      return Promise.all(deleteOldCaches);
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // درخواست‌های غیرمجاز مثل chrome-extension، data، blob و درخواست‌های خارج از سایت را نادیده بگیر
  if (!canHandleRequest(request)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!canCacheResponse(networkResponse)) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone).catch((error) => {
              console.warn("Service Worker: Cache put failed:", request.url);
            });
          });

          return networkResponse;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return new Response("", {
            status: 408,
            statusText: "Offline"
          });
        });
    })
  );
});
