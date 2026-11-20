var CACHE_NAME = "ente-qr-static-v2";
var STATIC_ASSETS = [
  "/index.html",
  "/register-sw.js",
  "/site.webmanifest",
  "/assets/apple-touch-icon.png",
  "/assets/bg-ghosts.svg",
  "/assets/bg-pattern.svg",
  "/assets/favicon.svg",
  "/assets/fonts/gochi-hand.woff2",
  "/assets/vendor/qr-code-styling.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    cache.addAll(STATIC_ASSETS.map((path) => new Request(path, { cache: "reload" }))),
  ).then(() => self.skipWaiting()));
});

// Old caches go as soon as this worker takes over, so an offline fallback can never pair the
// new page with an old copy of the QR library.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  var request = event.request;
  var url = new URL(request.url);
  var path = url.pathname === "/" ? "/index.html" : url.pathname;
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      !STATIC_ASSETS.includes(path)) {
    return;
  }
  event.respondWith(networkFirst(event, path));
});

function networkFirst(event, path) {
  return fetch(event.request).then((response) => {
    if (response.ok) {
      var copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(path, copy)));
    }
    return response;
  }, () => caches.open(CACHE_NAME).then((cache) => cache.match(path)));
}
