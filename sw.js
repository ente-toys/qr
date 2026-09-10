var CACHE_NAME = "ente-qr-static-v1";
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
  ));
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
