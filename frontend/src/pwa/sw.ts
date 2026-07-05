/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

self.skipWaiting();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback so the app shell loads offline for any route.
const navHandler = createHandlerBoundToURL('index.html');
registerRoute(
  new NavigationRoute(navHandler, {
    denylist: [/^\/api\//],
  }),
);

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  let data: PushPayload = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { body: event.data?.text() };
  }
  const title = data.title ?? 'Mnemonica Trainer';
  const options: NotificationOptions = {
    body: data.body ?? 'Time for your daily stack drill.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url ?? '/train' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && (event.notification.data as { url?: string }).url) || '/train';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            void client.focus();
            if ('navigate' in client) void (client as WindowClient).navigate(targetUrl);
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
