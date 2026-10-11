const CACHE_VERSION = 'fp-v1.20.2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Service Worker para Web Push y Notificaciones Locales - Finance Pal
function buildNotificationOptions(data = {}) {
  const silent = Boolean(data.silent);
  const vibrate = silent ? undefined : (Array.isArray(data.vibrate) ? data.vibrate : [100, 50, 100]);
  return {
    body: data.body || "Tienes un recordatorio pendiente.",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    silent,
    vibrate,
    data: {
      ...(data.data || {}),
      url: data.url || data.data?.url || "/",
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: "explore",
        title: "Abrir Finance Pal",
      },
    ],
  };
}

self.addEventListener("push", (event) => {
  let data = {
    title: "Finance Pal",
    body: "Tienes un recordatorio pendiente.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    url: "/",
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = buildNotificationOptions(data);
  event.waitUntil(self.registration.showNotification(data.title || "Finance Pal", options));
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "SHOW_LOCAL_NOTIFICATION" && msg.payload) {
    const payload = msg.payload;
    const title = payload.title || "Finance Pal";
    const options = buildNotificationOptions(payload);
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          if ("navigate" in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

