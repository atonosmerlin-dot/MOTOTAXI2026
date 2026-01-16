/**
 * Script de teste para enviar notificação de push manualmente
 * Use no console do navegador para testar
 */

window.testPushNotification = async () => {
  console.log('🧪 [TEST] Iniciando teste de notificação...');
  
  try {
    // 1. Verificar SW
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      console.error('❌ Service Worker não registrado');
      return;
    }
    console.log('✅ Service Worker encontrado');

    // 2. Verificar subscription
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.error('❌ Push subscription não encontrada');
      console.log('💡 Dica: Clique no sino (🔔) para ativar notificações');
      return;
    }
    console.log('✅ Push subscription encontrada');

    // 3. Simular notificação
    console.log('📬 Enviando notificação de teste...');
    await registration.showNotification('🧪 TESTE DE NOTIFICAÇÃO', {
      body: 'Se você vê isso, push notifications estão funcionando! 🎉',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'test-notification',
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300, 100, 300],
      actions: [
        { action: 'dismiss', title: '✓ OK' }
      ]
    });

    console.log('✅ Notificação de teste enviada com sucesso!');

    // 4. Log da subscription para debug
    const json = subscription.toJSON();
    console.log('📊 Detalhes da subscription:');
    console.log('  Endpoint:', json.endpoint);
    console.log('  P256dh:', json.keys?.p256dh);
    console.log('  Auth:', json.keys?.auth);

  } catch (error) {
    console.error('❌ Erro ao testar:', error);
  }
};

// Adicionar ao console
window.pushDebug = {
  test: window.testPushNotification,
  help: () => {
    console.log(`
🔧 PUSH DEBUG COMMANDS:
========================

1. TEST NOTIFICATION:
   pushDebug.test()
   - Envia uma notificação de teste ao seu device

2. CHECK SERVICE WORKER:
   navigator.serviceWorker.getRegistration('/').then(r => console.log(r))

3. CHECK SUBSCRIPTION:
   navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription().then(s => console.log(s)))

4. CHECK PERMISSION:
   console.log(Notification.permission)

5. REQUEST PERMISSION:
   Notification.requestPermission()

6. VIEW LOGS:
   - Abra DevTools (F12) > Console
   - Procure por [SW], [PUSH], [DEBUG] para logs do Service Worker
    `);
  }
};

console.log('✅ Push Debug commands carregados!');
console.log('   Digite: pushDebug.help() para ver comandos');
console.log('   Digite: pushDebug.test() para testar notificação');

// Also log to console on load
console.log('🔔 MotoPoint Push Notifications');
console.log('==================================');
console.log('Debug Panel: Clique no ícone 🔔 (canto inferior direito)');
console.log('ou digite: pushDebug.help()');
