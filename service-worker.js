// Offline shell and notification support.
// Cache offline e suporte a notificacoes.
const CACHE_NAME = 'gerencia-ponto-v1';
const APP_SHELL = ['./', './index.html', './css/style.css', './js/storage.js', './js/supabase-config.js', './js/auth.js', './js/cloud.js', './js/app.js', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title, { body: event.data.body });
  }
});
