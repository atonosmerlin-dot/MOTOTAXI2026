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
        icon: data.icon,
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200, 100, 200, 100, 400],
        data: { url: data.url },
        tag: data.tag,
        renotify: true,
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Aceitar' }
        ],
        // Sound support (Android/Chrome support varies)
        // User must place notification.mp3 in public folder
        sound: '/notification.mp3'
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Always default to /driver for ride requests to ensure we open the dashboard
    const targetUrl = new URL(event.notification.data?.url || '/driver', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // 1. Try to find ANY open window of our app
                // We match loosely: if the client url starts with our origin
                for (const client of windowClients) {
                    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                        // If it's specifically the driver dashboard, perfect. 
                        // If not, we focus it and navigate.
                        return client.focus().then(c => {
                            if (c && 'navigate' in c) {
                                return c.navigate(targetUrl);
                            }
                            return c;
                        });
                    }
                }

                // 2. If no window open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});
