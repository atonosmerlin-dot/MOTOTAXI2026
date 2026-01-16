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

    // Configurar VAPID no início da requisição
    const VAPID_PUBLIC_KEY = env.VAPID_PUBLIC_KEY || '';
    const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY || '';
    
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails('mailto:admin@motopoint.online', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      console.log('[NOTIFY-API] ✅ VAPID configurado');
    } else {
      console.warn('[NOTIFY-API] ⚠️ VAPID não configurado');
      return new Response(JSON.stringify({ 
        ok: false,
        error: 'VAPID keys not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

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
    const subscriptions = (subs || [])
      .map(s => {
        try {
          return typeof s.subscription === 'string' ? JSON.parse(s.subscription) : s.subscription;
        } catch (e) {
          console.warn('[NOTIFY-API] ⚠️ Erro ao fazer parse de subscription');
          return null;
        }
      })
      .filter(Boolean);

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

    // 4. Preparar payload da notificação
    const payloadData = {
      title: 'Nova corrida disponível! 🎯',
      body: `Novo pedido em ${point_name || 'um ponto'}${destination ? ` para ${destination}` : ''}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'ride-notification',
      requireInteraction: true,
      url: '/driver',
      timestamp: Date.now(),
      data: {
        ride_request_id,
        point_id,
        point_name,
        destination,
        client_name
      }
    };

    const payloadStr = JSON.stringify(payloadData);

    console.log(`[NOTIFY-API] 📤 Enviando para ${subscriptions.length} dispositivos...`);
    
    // 5. Enviar notificações em paralelo
    let sent = 0;
    let failed = 0;
    const failedReasons = [];

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
          failed++;
          return;
        }

        await webpush.sendNotification(sub, payloadStr);
        sent++;
        console.log('[NOTIFY-API] ✅ Notificação enviada com sucesso');
      } catch (error) {
        failed++;
        console.error('[NOTIFY-API] ❌ Falha ao enviar:', error?.statusCode, error?.message);
        
        if (error.statusCode === 401) failedReasons.push('401 Unauthorized (Chaves VAPID inválidas)');
        else if (error.statusCode === 410) failedReasons.push('410 Gone (Token expirado)');
        else failedReasons.push(error.message || 'Erro desconhecido');
      }
    }));

    console.log(`[NOTIFY-API] 📊 Resultado: ${sent} enviadas, ${failed} falhadas`);

    return new Response(JSON.stringify({ 
      ok: sent > 0,
      message: `Notificações push enviadas`,
      drivers_online: driversCount,
      subscriptions_found: subscriptions.length,
      sent,
      failed,
      ride_request_id,
      failed_reasons: [...new Set(failedReasons)]
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

