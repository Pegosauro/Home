/* ============================================================
   HOME APP — Service Worker
   Cache offline dell'app shell + aggiornamento controllato.

   - L'app si apre anche SENZA rete (carica i file dalla cache).
   - Online prende SEMPRE la versione fresca dalla rete (strategia
     "network-first"): non serve più il trucco ?v=2 per aggiornare.
   - Quando esce una nuova versione, l'app mostra un avviso e
     aggiorna solo dopo conferma (vedi registerSW in app.js).

   IMPORTANTE per chi pubblica: a OGNI rilascio cambia CACHE_VERSION
   qui sotto (es. casa-app-2.6.1). Così il browser scarta la vecchia
   cache e propone l'aggiornamento.
   ============================================================ */
var CACHE_VERSION = "casa-app-2.9.4";

// File che compongono l'app (tutti nella root, stesso livello di index.html).
var APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./base.css",
  "./themes.css",
  "./layout.css",
  "./components.css",
  "./home.css",
  "./lavori.css",
  "./idee.css",
  "./spesa.css",
  "./stanza.css",
  "./opzioni.css",
  "./icon-192.png",
  "./icon-512.png"
];

// INSTALL: precarica l'app shell. Niente skipWaiting automatico: la nuova
// versione resta "in attesa" finché l'utente non conferma dall'app.
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // addAll fallisce se anche un solo file manca: usiamo put singoli
      // tolleranti così un file mancante non blocca l'intera installazione.
      return Promise.all(APP_SHELL.map(function (url) {
        return fetch(url, { cache: "no-cache" })
          .then(function (res) { if (res && res.ok) return cache.put(url, res); })
          .catch(function () {});
      }));
    })
  );
});

// ACTIVATE: elimina le cache delle versioni precedenti e prende il controllo.
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// L'app chiede di attivare subito la nuova versione (dopo conferma utente).
self.addEventListener("message", function (e) {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

// FETCH: network-first per i file della nostra origine; tutto il resto
// (login Google, API Drive, ecc.) passa diretto alla rete senza toccare la cache.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // cross-origin: non intercettare

  e.respondWith(
    fetch(req).then(function (res) {
      // Salva una copia fresca in cache per l'uso offline successivo.
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      // Offline: servi dalla cache; per le navigazioni ripiega su index.html.
      return caches.match(req).then(function (cached) {
        if (cached) return cached;
        if (req.mode === "navigate") return caches.match("./index.html");
        return cached;
      });
    })
  );
});
