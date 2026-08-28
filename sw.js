var CACHE_NAME = "ente-qr-static-v1";
var OFFLINE_NAVIGATION = {
  "/": "/index.html",
  "/index.html": "/index.html",
  "/why": "/why.html",
  "/why.html": "/why.html",
};

var STATIC_ASSETS = [
  "/",
  "/apple-touch-icon.png",
  "/bg-ghosts.svg",
  "/bg-pattern.svg",
  "/blog-assets/share-sheet.mp4",
  "/favicon.svg",
  "/fonts/gilroy-bold.woff2",
  "/fonts/gilroy-extrabold.woff2",
  "/fonts/gilroy-heavy.woff2",
  "/fonts/gilroy-medium.woff2",
  "/fonts/gilroy-regular.woff2",
  "/fonts/gilroy-semibold.woff2",
  "/fonts/gochi-hand.woff2",
  "/fonts/GochiHand-OFL.txt",
  "/hero.png",
  "/index.html",
  "/og-ente-qr.png",
  "/register-sw.js",
  "/robots.txt",
  "/site.webmanifest",
  "/sw.js",
  "/vendor/qr-code-styling.js",
  "/why.html",
];

function cacheRequest(cache, asset) {
  var request = new Request(asset, {
    cache: "reload",
    credentials: "same-origin",
  });

  return fetch(request)
    .then((response) => {
      if (response.ok) {
        return cache.put(request, response).catch(() => { });
      }
      return undefined;
    })
    .catch(() => { });
}

function cacheStaticAssets() {
  return caches
    .open(CACHE_NAME)
    .then((cache) =>
      Promise.all(STATIC_ASSETS.map((asset) => cacheRequest(cache, asset))),
    );
}

function cachedResponseFor(request) {
  var url = new URL(request.url);
  return caches
    .match(request)
    .then((cached) => cached || caches.match(url.pathname));
}

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (!response || !response.ok || response.type !== "basic") {
      return response;
    }

    var copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => {
      cache.put(request, copy);
    });
    return response;
  });
}

function navigationFallback(request) {
  return fetch(request).catch(() => {
    var path = new URL(request.url).pathname;
    return caches.match(OFFLINE_NAVIGATION[path] || "/index.html");
  });
}

function rangeResponse(request) {
  return cachedResponseFor(request).then((cached) => {
    if (!cached) {
      return fetch(request);
    }

    var range = request.headers.get("range");
    var matches = /^bytes=(\d*)-(\d*)$/.exec(range || "");
    if (!matches) {
      return cached;
    }

    return cached.blob().then((blob) => {
      var size = blob.size;
      var start = matches[1] ? Number(matches[1]) : 0;
      var end = matches[2] ? Number(matches[2]) : size - 1;

      if (start >= size || end >= size || start > end) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": "bytes */" + size,
          },
        });
      }

      var headers = new Headers(cached.headers);
      var body = blob.slice(start, end + 1);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Length", String(body.size));
      headers.set("Content-Range", "bytes " + start + "-" + end + "/" + size);
      headers.set(
        "Content-Type",
        cached.headers.get("Content-Type") || "application/octet-stream",
      );

      return new Response(body, {
        status: 206,
        statusText: "Partial Content",
        headers: headers,
      });
    });
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheStaticAssets().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return undefined;
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  var request = event.request;
  var url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationFallback(request));
    return;
  }

  if (request.headers.has("range")) {
    event.respondWith(rangeResponse(request));
    return;
  }

  event.respondWith(
    cachedResponseFor(request).then(
      (cached) => cached || fetchAndCache(request),
    ),
  );
});
