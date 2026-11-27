// Service worker de Obra: permite instalar la app. Las notificaciones llegan en la fase 2.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
