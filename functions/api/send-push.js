import webpush from 'web-push';

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@motopoint.online', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[SEND-PUSH] VAPID configured');
}

export const onRequest = async (context) => {
  const { request } = context;
  console.log('[SEND-PUSH] Request:', request.method, request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only POST
  if (request.method !== 'POST') {
    console.log('[SEND-PUSH] ✗ Invalid method:', request.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const body = await request.json();
    const { subscriptions = [], title = 'Nova Corrida!', body: bodyText = '', url = '/driver' } = body;

    console.log(`[SEND-PUSH] ✓ Received ${subscriptions.length} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[SEND-PUSH] No subscriptions, returning success');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const payloadData = {
      title,
      body: bodyText,
      url,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      timestamp: Date.now(),
    };

    // Use TextEncoder for Cloudflare compatibility
    const payloadStr = JSON.stringify(payloadData);
    const payload = new TextEncoder().encode(payloadStr);

    let sent = 0;
    let failed = 0;

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        if (!sub || !sub.endpoint) {
          failed++;
          continue;
        }

        const subscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh || sub.p256dh || '',
            auth: sub.keys?.auth || sub.auth || '',
          },
        };

        if (!subscription.keys.p256dh || !subscription.keys.auth) {
          console.warn('[SEND-PUSH] ✗ Invalid subscription keys');
          failed++;
          continue;
        }

        await webpush.sendNotification(subscription, payload);
        sent++;
        console.log('[SEND-PUSH] ✓ Notification sent successfully');
      } catch (error) {
        failed++;
        console.warn('[SEND-PUSH] ✗ Send failed:', error?.message);
      }
    }

    console.log(`[SEND-PUSH] Results: ${sent}/${subscriptions.length} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        total: subscriptions.length,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[SEND-PUSH] ✗ Error:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to send notifications',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
