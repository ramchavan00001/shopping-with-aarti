// Service worker: makes the site installable, keeps it usable on patchy mobile
// data (pages, images and catalogue data seen before still open offline) and
// shows push notifications. Plain JS, served as-is from /sw.js.
//
// Bump VERSION to drop every cache on the next visit.
const VERSION = "v1";
const CACHES = {
  pages: `aarti-${VERSION}-pages`,
  assets: `aarti-${VERSION}-assets`,
  images: `aarti-${VERSION}-images`,
  api: `aarti-${VERSION}-api`,
};
const LIMITS = { pages: 30, assets: 120, images: 250, api: 80 };
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHES.pages)
      .then((c) => c.addAll(["/", OFFLINE, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set(Object.values(CACHES));
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("aarti-") && !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Keep a cache to `max` entries, oldest first out. */
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

async function put(kind, request, response) {
  if (!response || !response.ok || response.type !== "basic") return;
  const cache = await caches.open(CACHES[kind]);
  await cache.put(request, response);
  await trim(CACHES[kind], LIMITS[kind]);
}

async function networkFirst(kind, request, fallback) {
  try {
    const response = await fetch(request);
    put(kind, request, response.clone());
    return response;
  } catch (err) {
    const cached = (await caches.match(request)) || (fallback && (await fallback()));
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(kind, request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  put(kind, request, response.clone());
  return response;
}

async function staleWhileRevalidate(kind, request, event) {
  const cached = await caches.match(request);
  const network = fetch(request).then((response) => {
    put(kind, request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Other sites (videos, store images) and private or tracking paths go straight to the network.
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.startsWith("/admin") || path.startsWith("/api/admin") || path.startsWith("/go/") || path.startsWith("/api/cron") || path === "/sw.js") return;

  if (request.mode === "navigate") {
    // Fresh page when online; the saved page or the app shell (which routes
    // on the client) when offline.
    event.respondWith(
      networkFirst("pages", request, async () => (await caches.match("/")) || caches.match(OFFLINE)),
    );
  } else if (path.startsWith("/assets/")) {
    event.respondWith(cacheFirst("assets", request));
  } else if (path === "/img" || path.startsWith("/images/") || path.startsWith("/icons/") || path.startsWith("/og/")) {
    event.respondWith(staleWhileRevalidate("images", request, event));
  } else if (path.startsWith("/api/") && !path.startsWith("/api/push")) {
    event.respondWith(networkFirst("api", request));
  }
});

/* ------------------------------------------------------- Notifications -- */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  const title = data.title || "Shopping with Aarti";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      image: data.image || undefined,
      tag: data.tag || undefined,
      data: { url: data.url || "/", id: data.id },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url = "/", id } = event.notification.data || {};
  const target = new URL(url, self.location.origin);
  if (!target.searchParams.has("utm_source")) target.searchParams.set("utm_source", "push");
  event.waitUntil(
    (async () => {
      if (id) fetch(`/api/push/click/${encodeURIComponent(id)}`, { method: "POST" }).catch(() => {});
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return open.navigate(target.href).catch(() => self.clients.openWindow(target.href));
      }
      return self.clients.openWindow(target.href);
    })(),
  );
});

// Browsers occasionally rotate a subscription; re-register the new one.
self.addEventListener("pushsubscriptionchange", (event) => {
  const options = event.oldSubscription && event.oldSubscription.options;
  if (!options) return;
  event.waitUntil(
    self.registration.pushManager.subscribe(options).then((sub) =>
      fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), replaces: event.oldSubscription.endpoint }),
      }),
    ),
  );
});
