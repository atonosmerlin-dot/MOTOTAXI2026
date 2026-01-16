import { getSupabaseClient } from '../lib/supabase';
import webpush from 'web-push';

export const onRequest = async (context) => {
  const { request, env } = context;
  
  console.log('[NOTIFY-API] Method:', request.method, 'URL:', request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
    });
  }
  
  if (request.method !== 'POST') {
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
    const { ride_request_id, point_id, point_name, destination, client_name } = body;
    
    console.log('[NOTIFY-API] 🔔 NOTIFICAÇÃO DE CORRIDA RECEBIDA');

    const supabase = getSupabaseClient(env);

    // 1. Buscar motoristas online
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('is_online', true);
    
    if (driverError) throw driverError;

    const driversCount = drivers?.length || 0;
    const driverIds = (drivers || []).map(d => d.id).filter(Boolean);
    
    if (!driverIds.length) {
      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'Nenhum motorista online',
        sent: 0 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. Buscar subscriptions desses motoristas
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .in('driver_id', driverIds)
      .eq('enabled', true);

    if (subsError) throw subsError;

    // 3. Preparar subscriptions
    let parseErrors = 0;
    const subscriptions = (subs || [])
      .map(s => {
        try {
          return typeof s.subscription === 'string' ? JSON.parse(s.subscription) : s.subscription;
        } catch (e) {
          parseErrors++;
          return null;
        }
      })
      .filter(Boolean); // Remove nulos

    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ 
        ok: false, 
        message: 'Nenhuma subscription válida encontrada',
        drivers_online: driversCount
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 4. Configurar VAPID se disponível
    const VAPID_PUBLIC_KEY = env.VAPID_PUBLIC_KEY || '';
    const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY || '';
    
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails('mailto:admin@motopoint.online', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      console.log('[NOTIFY-API] ✅ VAPID configurado');
    } else {
      console.warn('[NOTIFY-API] ⚠️ VAPID não configurado - notificações podem falhar');
    }

    // 5. Preparar payload da notificação
    const payloadData = {
      title: 'Nova chamada!',
      body: `📍 ${point_name} → ${destination}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'motopoint-call',
      requireInteraction: true,
      vibrate: [300, 100, 300],
      data: {
        ride_request_id,
        point_id,
        point_name,
        destination,
        client_name,
        url: '/driver'
      }
    };

    const payloadStr = JSON.stringify(payloadData);

    // 6. Enviar notificações para cada motorista
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const subscription of subscriptions) {
      try {
        if (!subscription || !subscription.endpoint) {
          failed++;
          continue;
        }

        const sub = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys?.p256dh || '',
            auth: subscription.keys?.auth || '',
          },
        };

        if (!sub.keys.p256dh || !sub.keys.auth) {
          console.warn('[NOTIFY-API] ✗ Subscription inválida - faltam chaves');
          failed++;
          continue;
        }

        await webpush.sendNotification(sub, payloadStr);
        sent++;
        console.log('[NOTIFY-API] ✅ Notificação enviada com sucesso');
      } catch (error) {
        failed++;
        errors.push(error?.message || 'Erro desconhecido');
        console.warn('[NOTIFY-API] ❌ Falha ao enviar:', error?.message);
      }
    }

    console.log(`[NOTIFY-API] 📊 Resultado: ${sent} enviadas, ${failed} falhadas`);
    console.log(`[NOTIFY-API] Motoristas online: ${driversCount}`);
    console.log(`[NOTIFY-API] Ponto: ${point_name}, Destino: ${destination}`);

    return new Response(JSON.stringify({ 
      ok: true,
      message: `Notificações push enviadas com sucesso`,
      drivers_online: driversCount,
      subscriptions_found: subscriptions.length,
      sent,
      failed,
      ride_request_id,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('[NOTIFY-API] Critical Error:', err);
    return new Response(JSON.stringify({ error: err.message, ok: false }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

