// Service worker: "red primero, caché de respaldo".
// - Con conexión: siempre descarga la versión más reciente y actualiza la caché.
// - Sin conexión: sirve la copia guardada (la app funciona offline).
// Cambia CACHE si modificas la lista de archivos.
importScripts('palabras.js', 'premios.js');   // palabras para leer y pegatinas

var CACHE = 'sumas-v47';
// Grabaciones opcionales: se guardan si existen; si faltan no pasa nada
var OPTIONAL = ['muy-bien', 'uy', 'quedan', 'son', 'premio', 'premio-oro', 'album-completo', 'album-nuevo'];
for (var n = 0; n <= 10; n++) OPTIONAL.push('era-' + n, 'si-a-' + n, 'quito-' + n, 'pongo-' + n);
self.PALABRAS.forEach(function (p) {
  var sils = p[0].split('-');
  OPTIONAL.push(self.palabraClip(p[0]));
  sils.forEach(function (s, i) { OPTIONAL.push(self.silabaClip(sils, i)); });
});
(self.MAS_PALABRAS || []).forEach(function (p) { OPTIONAL.push(self.palabraClip(p[0])); });
(self.PALABRAS_LARGAS || []).forEach(function (p) { OPTIONAL.push(self.palabraClip(p[0])); });
(self.ALBUMES || []).forEach(function (a) {
  a[2].forEach(function (st) { OPTIONAL.push(self.premioClip(st[1])); });
});
OPTIONAL.push('como-en');
OPTIONAL.push('y');
self.SILABAS.forEach(function (x) {
  OPTIONAL.push(self.silabaClip([x[0]], 0));
  if (x[0].charAt(0) !== 'H') OPTIONAL.push('q-' + self.clipNorm(x[0]));   // juego: solo la sílaba
  x[1].forEach(function (ex) { OPTIONAL.push(self.palabraClip(ex[0])); });
  self.letrasDe(x[0]).forEach(function (l) { OPTIONAL.push(self.letraClip(l)); });
});
OPTIONAL = OPTIONAL.filter(function (v, i, a) { return a.indexOf(v) === i; });
OPTIONAL = OPTIONAL.map(function (name) { return './audio/' + name + '.mp3'; });
(self.ALBUMES || []).forEach(function (a) {   // dibujos propios de las pegatinas
  a[2].forEach(function (st) { if (/\.svg$/.test(st[0])) OPTIONAL.push('./' + st[0]); });
});
var ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './palabras.js',
  './premios.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        // cache: 'reload' evita guardar copias antiguas de la caché HTTP del navegador
        return cache.addAll(ASSETS.map(function (url) {
          return new Request(url, { cache: 'reload' });
        })).then(function () {
          return Promise.all(OPTIONAL.map(function (url) {
            return fetch(url, { cache: 'reload' })
              .then(function (res) { if (res.ok) return cache.put(url, res); })
              .catch(function () {});
          }));
        });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (cached) {
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
      })
  );
});
