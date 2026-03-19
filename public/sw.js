// Service Worker — Strava Stats

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}

  const title   = data.title || 'Strava Stats';
  const options = {
    body:    data.body || '',
    icon:    data.icon || '/icons/apple-touch-icon.png',
    badge:   '/icons/apple-touch-icon.png',
    tag:     data.type || 'default',
    renotify: true,
    data:    { leagueId: data.leagueId },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
