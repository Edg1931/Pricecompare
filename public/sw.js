// Service worker retired — unregisters itself on first contact so stale
// cached chunks and HTML from the previous SW no longer block page loads.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => self.clients.matchAll()).then((clients) => {
      clients.forEach((c) => c.postMessage({ type: "SW_UNREGISTERED" }));
    })
  );
});
