import webpush from 'web-push';

// Configuração VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@motopoint.online',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[SEND-PUSH] ✅ VAPID keys configured');
} else {
  console.warn('[SEND-PUSH] ⚠️ VAPID keys not configured');
}

/**
 * POST /send-push
 * Body: { subscriptions: [...], payload: "JSON string" }
 * Retorna: { sent: number, failed: number, errors: [...] }
 */
export async function handleSendPush(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptions, payload } = req.body;

    if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(400).json({ error: 'subscriptions array required' });
    }

    if (!payload) {
      return res.status(400).json({ error: 'payload required' });
    }

    console.log(`[SEND-PUSH] 📤 Enviando para ${subscriptions.length} dispositivos...`);

    let sent = 0;
    let failed = 0;
    const errors = [];

    // Enviar em paralelo com Promise.all
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          // Validação
          if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
            failed++;
            errors.push('Invalid subscription structure');
            return;
          }

          // Envio via web-push (roda em Node.js, https.request disponível)
          await webpush.sendNotification(sub, payload);
          sent++;
          console.log('[SEND-PUSH] ✅ Enviada com sucesso');
        } catch (error) {
          failed++;
          const msg = error?.message || String(error);
          console.error('[SEND-PUSH] ❌ Erro:', msg);
          
          if (msg.includes('410')) errors.push('410 Gone (Subscription expirada)');
          else if (msg.includes('401')) errors.push('401 Unauthorized');
          else errors.push(msg);
        }
      })
    );

    console.log(`[SEND-PUSH] ✅ Resultado: ${sent} enviadas, ${failed} falhadas`);

    return res.status(200).json({
      ok: sent > 0,
      sent,
      failed,
      total: subscriptions.length,
      errors: [...new Set(errors)],
    });
  } catch (error) {
    console.error('[SEND-PUSH] Erro crítico:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
