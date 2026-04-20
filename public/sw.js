// Minimal service worker — app-shell caching only. WebRTC calls still need
// network, so there's no point pretending the dialer works offline.
// Notes and small drafts are persisted via IndexedDB (src/lib/pwa/offline-drafts.ts).

const CACHE = "dialer-by-launchcraft-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? fetchPromise;
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title ?? "Dialer by LaunchCraft", {
        body: data.body ?? "",
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        data: data.data ?? {},
      }),
    );
  } catch {
    /* ignore malformed payloads */
  }
});
