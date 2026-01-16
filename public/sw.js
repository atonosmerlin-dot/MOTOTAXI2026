// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('[SW-PUSH] 🔔 Push notification received!');
  
  let data = {
    title: 'Nova chamada!',
    body: 'Você tem uma nova solicitação de corrida',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'motopoint-call',
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300, 100, 300],
    actions: [
      { action: 'accept', title: '✓ Aceitar' },
      { action: 'reject', title: '✗ Recusar' }
    ],
    data: {
      url: '/driver'
    }
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW-PUSH] ✓ JSON payload recebido:', payload);
      data = { ...data, ...payload };
    } catch (e) {
      console.log('[SW-PUSH] ⚠️ JSON parse falhou, tentando texto:', e.message);
      try {
        const text = event.data.text();
        console.log('[SW-PUSH] Payload como texto:', text);
        // Tentar parse novamente
        try {
          const parsed = JSON.parse(text);
          console.log('[SW-PUSH] ✓ Conseguiu fazer parse do texto:', parsed);
          data = { ...data, ...parsed };
        } catch (e2) {
          data.body = text;
        }
      } catch (e3) {
        console.log('[SW-PUSH] ✗ Nenhuma forma de ler o payload:', e3.message);
      }
    }
  } else {
    console.log('[SW-PUSH] ⚠️ event.data é vazio');
  }

  console.log('[SW-PUSH] 📢 Mostrando notificação com:', data);
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      vibrate: data.vibrate,
      data: data.data,
      actions: data.actions,
      sound: data.sound || undefined,
      priority: 'high',
    }).then(() => {
      console.log('[SW-PUSH] ✅ NOTIFICAÇÃO EXIBIDA COM SUCESSO!');
    }).catch((error) => {
      console.error('[SW-PUSH] ❌ ERRO AO EXIBIR NOTIFICAÇÃO:', error);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW-CLICK] 👆 Notificação clicada, ação:', event.action);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/driver';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Procura janela aberta
        for (const client of windowClients) {
          if (client.url.includes('/driver') && 'focus' in client) {
            console.log('[SW-CLICK] ✓ Janela encontrada, focando...');
            return client.focus();
          }
        }
        // Abre nova janela
        console.log('[SW-CLICK] Abrindo nova janela:', urlToOpen);
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[SW-CLOSE] Notificação fechada pelo usuário');
});
