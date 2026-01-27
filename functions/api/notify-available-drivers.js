import { getSupabaseClient } from '../lib/supabase';
import { sendPush } from '../lib/push-sender';

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
    console.log('[NOTIFY-API] 📋 Detalhes:', {
      ride_request_id,
      point_id,
      point_name,
      destination,
      client_name,
      timestamp: new Date().toISOString()
    });

    // Configurar VAPID
    const VAPID_PUBLIC_KEY = env.VAPID_PUBLIC_KEY || '';
    const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY || '';

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('[NOTIFY-API] ⚠️ VAPID não configurado corretamente no Cloudflare');
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
    console.log('[NOTIFY-API] 🔍 Buscando motoristas online...');
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('is_online', true);

    if (driverError) throw driverError;

    const driversCount = drivers?.length || 0;
    const driverIds = (drivers || []).map(d => d.id).filter(Boolean);

    console.log(`[NOTIFY-API] 🏍️ Motoristas online encontrados: ${driversCount}`, driverIds);

    if (!driverIds.length) {
      console.warn('[NOTIFY-API] ⚠️ Nenhum motorista online!');
      return new Response(JSON.stringify({
        ok: true,
        message: 'Nenhum motorista online',
        drivers_online: 0,
        sent: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. Buscar subscriptions desses motoristas
    console.log(`[NOTIFY-API] 🔔 Buscando subscriptions para ${driverIds.length} motoristas...`);
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('subscription, driver_id')
      .in('driver_id', driverIds)
      .eq('enabled', true);

    if (subsError) throw subsError;

    console.log(`[NOTIFY-API] 📨 Subscriptions encontradas: ${subs?.length || 0}`, 
      subs?.map(s => ({ driver_id: s.driver_id, has_endpoint: !!JSON.parse(s.subscription)?.endpoint })) || []
    );

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
        ok: true,
        message: 'Nenhuma subscription válida encontrada',
        drivers_online: driversCount,
        subscriptions_found: 0,
        sent: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    console.log(`[NOTIFY-API] 📤 Enviando push nativo para ${subscriptions.length} dispositivos...`);

    let sent = 0;
    let failed = 0;
    const failedReasons = [];

    // 4. Enviar notificações push (Silent Push - sem payload para evitar complexidade de criptografia no Cloudflare)
    // O Service Worker já está configurado em sw.js para mostrar uma mensagem padrão se o payload for vazio.
    await Promise.all(subscriptions.map(async (sub) => {
      try {
        if (!sub.endpoint) {
          failed++;
          return;
        }

        await sendPush(sub, {
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY
        });

        sent++;
      } catch (error) {
        failed++;
        console.error('[NOTIFY-API] ❌ Falha no envio nativo:', error.message);
        failedReasons.push(error.message);
      }
    }));

    console.log(`[NOTIFY-API] 📊 Resultado final: ${sent} enviadas, ${failed} falhadas`);

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

