const CACHE_NAME = "metalab-v2";
const APP_SHELL_URL = "/index.html";
const PRECACHE_URLS = ["/", APP_SHELL_URL];

function createOfflineResponse(request) {
  const isJsonRequest =
    request.headers.get("accept")?.includes("application/json") ||
    request.url.includes("/api/");

  return new Response(
    isJsonRequest ? JSON.stringify({ error: "Offline" }) : "Offline",
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": isJsonRequest ? "application/json" : "text/plain; charset=utf-8",
      },
    }
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }

        return response;
      } catch {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (event.request.mode === "navigate") {
          const appShell = await caches.match(APP_SHELL_URL);
          if (appShell) {
            return appShell;
          }
        }

        return createOfflineResponse(event.request);
      }
    })()
  );
});
