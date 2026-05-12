const CACHE = "pistos-v1";
const ASSETS = ["/", "/static/js/app.js", "/static/manifest.json"];
const OFFLINE_QUEUE_KEY = "pistos_offline_queue";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const { request } = e;
  // Network first for API calls; cache first for assets
  if (request.url.includes("/api/")) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline", queued: true }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );
  } else {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});

// Background sync — flush offline queue when connection restored
self.addEventListener("sync", e => {
  if (e.tag === "pistos-sync") {
    e.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  // Queue is managed by the frontend and flushed here on reconnect
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage({ type: "SYNC_READY" }));
}
