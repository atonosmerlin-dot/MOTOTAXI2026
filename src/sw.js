import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// 1. Workbox Precaching
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// 2. Control immediately
self.skipWaiting();
clientsClaim();

// 3. Push Logic (Professionalized)
self.addEventListener('push', (event) => {
    console.log('[SW] Push Received', event.data?.text());

    let data = {
        title: 'Nova Corrida!',
        body: 'Abra o app para ver detalhes.',
        icon: '/pwa-192x192.png', // We will generate this
        url: '/driver',
        tag: 'moto-request'
    };

    try {
        const json = event.data?.json();
        if (json) {
            data = { ...data, ...json };
        }
    } catch (e) {
        if (event.data) data.body = event.data.text();
    }

    const options = {
        body: data.body,
        icon: data.icon, // Android explicitly needs a 192px+ icon
        badge: '/badge-72x72.png', // Small monochrome icon for status bar (needs creation or fallback)
        vibrate: [200, 100, 200, 100, 200, 100, 400],
        data: { url: data.url },
        tag: data.tag,
        renotify: true, // Crucial for repeated alerts
        requireInteraction: true, // Keep notification until user interacts
        actions: [
            { action: 'open', title: 'Aceitar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Try to focus existing window
                for (const client of windowClients) {
                    if (client.url === urlToOpen || (client.url.includes(new URL(urlToOpen).pathname))) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
