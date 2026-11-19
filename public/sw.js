/*
 * Ember & Spice service worker (staff + kitchen apps only).
 * - Navigations to /staff, /kitchen, /admin: network first; when offline,
 *   show /offline.html ("Reconnecting…"), which reloads itself when back.
 * - Nothing else is intercepted or cached: live data must never be stale.
 */
const CACHE = "es-shell-v1";
const OFFLINE = "/offline.html";
const STAFF_PATHS = /^\/(staff|kitchen|admin)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !STAFF_PATHS.test(url.pathname)) return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
});
