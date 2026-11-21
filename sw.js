// Lets the app open with no signal once it has been loaded once.
// Change the version number whenever you update any file, so phones fetch the new copy.
var CACHE = 'ae-v66';
var FILES = ['./', 'index.html', 'styles.css', 'logic.js', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request).then(function (hit) { return hit || fetch(e.request); }));
});
