// Service Worker — Encore1Dessert
// Handles push notifications (iOS 16.4+ PWA)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Push event from server (future VAPID setup)
self.addEventListener('push', e => {
  const data = e.data?.json?.() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Encore1Dessert', {
      body: data.body || '',
      icon: '/apple-touch-icon.png',
      badge: '/favicon.png',
      tag: data.tag || 'e1d-notif',
      data: data,
    })
  );
});

// Focus app on notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) { client.focus(); return; }
      }
      self.clients.openWindow('/');
    })
  );
});
