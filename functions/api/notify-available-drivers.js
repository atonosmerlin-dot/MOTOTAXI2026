import { getSupabaseClient } from '../lib/supabase';

export const onRequest = async (context) => {
  const { request, env } = context;
  
  // URL do backend Node.js para enviar push notifications
  // Em desenvolvimento: http://localhost:3000
  // Em produção: variável de ambiente BACKEND_URL (via wrangler.toml)
  const BACKEND_URL = env.BACKEND_URL || 'http://localhost:3000';
  
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

    // 4. Preparar Payload
    const payloadData = {
      title: 'Nova corrida disponível! 🎯',
      body: `Novo pedido em ${point_name || 'um ponto'}${destination ? ` para ${destination}` : ''}`,
      url: '/driver',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      timestamp: Date.now(),
      tag: 'ride-notification',
      requireInteraction: true,
      data: {
        ride_request_id,
        point_id,
        client_name
      }
    };

    // Necessário converter para string para o web-push
    const payloadString = JSON.stringify(payloadData);

    console.log(`[NOTIFY-API] 📤 Delegando envio para ${subscriptions.length} dispositivos ao backend...`);
    
    try {
      // Delegar o envio de notificações ao backend Node.js que tem suporte a https.request
      const response = await fetch(`${BACKEND_URL}/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptions, payload: payloadString }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[NOTIFY-API] ❌ Backend error:', result);
        return new Response(JSON.stringify({ 
          ok: false,
          error: 'Backend error',
          details: result,
          drivers_online: driversCount,
          subscriptions_found: subscriptions.length
        }), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      console.log(`[NOTIFY-API] ✅ Backend response:`, result);

      return new Response(JSON.stringify({ 
        ok: result.ok,
        sent: result.sent,
        failed: result.failed,
        total: result.total,
        drivers_online: driversCount,
        subscriptions_found: subscriptions.length,
        backend_errors: result.errors
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      console.error('[NOTIFY-API] ❌ Erro ao delegar para backend:', error);
      return new Response(JSON.stringify({ 
        ok: false,
        error: 'Failed to reach backend',
        message: error?.message,
        drivers_online: driversCount,
        subscriptions_found: subscriptions.length
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

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


