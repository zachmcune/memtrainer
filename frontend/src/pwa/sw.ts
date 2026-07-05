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
registerRoute(new NavigationRoute(navHandler));
