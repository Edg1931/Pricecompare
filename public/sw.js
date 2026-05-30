// Conservative service worker for the Reseller PWA.
//
// Strategy (chosen so online users never see stale data):
//  - Cache-first ONLY for content-addressed static assets (/_next/static, fonts,
//    images) — these are immutable, so caching is always safe.
//  - Network-first for page navigations, falling back to a cached copy of that
//    page (or a minimal offline notice) only when the network is unavailable.
//  - Never cache API responses.

const CACHE = "reseller-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|svg|png|jpg|jpeg|webp|gif|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // always hit the network

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const cached = (await cache.match(req)) || (await cache.match("/scan"));
          if (cached) return cached;
          return new Response(
            "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:system-ui;background:#0a0b0f;color:#e5e7eb;display:grid;place-items:center;height:100vh;margin:0;text-align:center'><div><h1>You're offline</h1><p>Reconnect to load this page. Scans you save will upload automatically.</p></div>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
  }
});
