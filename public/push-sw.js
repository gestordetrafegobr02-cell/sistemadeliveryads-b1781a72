// DeliveryPro Push Service Worker
// Handles background push notifications so alerts fire even with app closed.

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  let data = { title: '🔔 Novo pedido!', body: 'Você recebeu um novo pedido.', url: '/admin' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    if (event.data) data.body = event.data.text();
  }

  const opts = {
    body: data.body,
    icon: '/logo.png?v=4',
    badge: '/logo.png?v=4',
    tag: data.tag || 'order',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 200, 400, 200, 400],
    data: { url: data.url || '/admin' },
  };
  event.waitUntil(self.registration.showNotification(data.title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsList) {
      if (c.url.includes(url)) { await c.focus(); return; }
    }
    await self.clients.openWindow(url);
  })());
});
