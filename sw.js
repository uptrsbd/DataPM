/* Service worker DataPM RSBD.
 * Hanya menyimpan "cangkang" aplikasi (index.html, manifest, ikon) agar aplikasi bisa dibuka cepat dan tampil walau sinyal putus.
 * DATA PM TIDAK PERNAH DISIMPAN: semua permintaan ke server (script.google.com), Google Login, dan font diteruskan apa adanya ke jaringan.
 * Naikkan VERSI setiap kali index.html diganti agar pengguna otomatis mendapat versi terbaru. */
var VERSI = 'datapm-v16';
var INTI = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(INTI); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

/* Halaman memberi tahu: pakai versi baru sekarang. */
self.addEventListener('message', function (e) { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // API, Google, font: langsung ke jaringan

  // Membuka halaman: utamakan jaringan (agar selalu versi terbaru), cadangan dari cache bila offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) { var salin = res.clone(); caches.open(VERSI).then(function (c) { c.put('./index.html', salin); }); }
        return res;
      }).catch(function () { return caches.match('./index.html', { ignoreSearch: true }).then(function (r) { return r || caches.match('./', { ignoreSearch: true }); }); })
    );
    return;
  }

  // Berkas statis (ikon, manifest): cache dulu, perbarui di belakang layar.
  e.respondWith(
    caches.match(req).then(function (hit) {
      var jaringan = fetch(req).then(function (res) {
        if (res && res.ok) { var salin = res.clone(); caches.open(VERSI).then(function (c) { c.put(req, salin); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || jaringan;
    })
  );
});
