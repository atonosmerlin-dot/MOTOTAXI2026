import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, optionsResponse } from '../lib/cors';

export async function onRequest(context: any) {
  const { request } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await request.json();
    const { requestId, driverId, price } = body;

    if (!requestId || !driverId || typeof price === 'undefined') {
      return new Response(
        JSON.stringify({ error: 'requestId, driverId and price required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // Ensure ride is still pending
    const { data: ride, error: rideErr } = await supabase
      .from('ride_requests')
      .select('id,status')
      .eq('id', requestId)
      .maybeSingle();

    if (rideErr) throw rideErr;
    if (!ride) {
      return new Response(JSON.stringify({ error: 'ride not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (ride.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'ride not pending' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('ride_proposals')
      .insert({ ride_id: requestId, driver_id: driverId, price })
      .select()
      .limit(1);

    if (error) throw error;

    // Touch parent ride to trigger realtime listeners
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
    console.error('propose-price error', err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: errorMsg }, 500);
  }
}
