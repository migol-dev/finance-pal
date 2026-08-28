// Service Worker para Web Push - Finance Pal
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

  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: "explore",
        title: "Abrir Finance Pal",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Si la ventana ya está abierta, enfocarla y navegar
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Si no está abierta, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
