const CACHE_NAME = 'casa-app-v1-2-flat';
const APP_FILES = [
  './', './index.html', './manifest.json', './base.css', './layout.css', './components.css', './home.css', './lavori.css', './idee.css', './stanza.css', './opzioni.css', './themes.css',
  './config.js', './storage.js', './state.js', './components.js', './view-home.js', './view-lavori.js', './view-idee.js', './view-stanza.js', './view-opzioni.js', './app.js', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
