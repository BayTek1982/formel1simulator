/* APEX GP – Service Worker: erst Netz (immer aktuell), sonst Zwischenspeicher (offline spielbar) */
const CACHE = 'apexgp-v1';
const ASSETS = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/util.js', 'js/tracks.js', 'js/car.js', 'js/world.js', 'js/fx.js', 'js/audio.js', 'js/sim.js', 'js/hud.js', 'js/main.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
