import { getSupabaseClient } from '../lib/supabase';

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

    // 4. Notificação simples (apenas alerta, sem dados complexos)
    console.log(`[NOTIFY-API] ✅ Notificação disparada para ${subscriptions.length} motoristas`);
    console.log(`[NOTIFY-API] Motoristas online: ${driversCount}`);
    console.log(`[NOTIFY-API] Ponto: ${point_name}, Destino: ${destination}`);

    return new Response(JSON.stringify({ 
      ok: true,
      message: 'Notificação enviada via Realtime',
      drivers_online: driversCount,
      subscriptions_found: subscriptions.length,
      ride_request_id
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


