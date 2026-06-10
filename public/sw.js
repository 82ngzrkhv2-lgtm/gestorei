// Gestorei Service Worker — PWA Push Notifications
// Feature-flagged: only active when PUSH_NOTIFICATIONS_ENABLED=true on server

const CACHE_NAME = 'gestorei-v1'

// Install: minimal precaching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/']))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return // never cache API calls
  // For everything else: try network, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

// Push: display system notification
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = { title: 'Gestorei', body: 'Você tem uma nova notificação.', icon: '/icons/icon-192.png', badge: '/icons/badge-72.png', data: {} }

  try {
    data = { ...data, ...event.data.json() }
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  data.icon,
      badge: data.badge,
      data:  data.data,
      vibrate: [100, 50, 100],
      requireInteraction: false,
    })
  )
})

// Notification click: open/focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
