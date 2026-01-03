import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, optionsResponse } from '../lib/cors';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await request.json();
    const { requestId, driverId, price } = body;
    if (!requestId || !driverId || typeof price === 'undefined') {
      return jsonResponse({ error: 'requestId, driverId and price required' }, 400);
    }

    const supabase = getSupabaseClient(env);

    const { data: ride, error: rideErr } = await supabase
      .from('ride_requests')
      .select('id,status')
      .eq('id', requestId)
      .maybeSingle();
    if (rideErr) throw rideErr;
    if (!ride) return jsonResponse({ error: 'ride not found' }, 404);
    if (ride.status !== 'pending') return jsonResponse({ error: 'ride not pending' }, 409);

    const { data, error } = await supabase
      .from('ride_proposals')
      .insert({ ride_id: requestId, driver_id: driverId, price })
      .select()
      .limit(1);
    if (error) throw error;

    try {
      await supabase
        .from('ride_requests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', requestId);
    } catch (e) {
      console.warn('Could not touch ride_requests.updated_at', e);
    }

    return jsonResponse(data?.[0] || null, 200);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: errorMsg }, 500);
  }
}
