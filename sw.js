// Offline: aplikacja działa bez zasięgu (zapis pozycji nie potrzebuje internetu).
const C = "xmarks-v3";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "vendor/leaflet-1.9.4.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // kafelki mapy i geokodowanie idą normalnie
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
