import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, optionsResponse } from '../lib/cors';

export async function onRequest(context: any) {
  const { request } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await request.json();
    const { requestId, driverId } = body;

    if (!requestId || !driverId) {
      return new Response(
        JSON.stringify({ error: 'requestId and driverId required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    // Atomically set to accepted only if still pending
    const { data: updated, error: acceptError } = await supabase
      .from('ride_requests')
      .update({ driver_id: driverId, status: 'accepted' })
      .match({ id: requestId, status: 'pending' })
      .select();

    if (acceptError) throw acceptError;
    if (!updated || (Array.isArray(updated) && updated.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Request already accepted or not pending' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark driver busy
    const { error: driverError } = await supabase
      .from('drivers')
      .update({ status: 'busy' })
      .eq('id', driverId);
    if (driverError) throw driverError;

    return jsonResponse({ ok: true, request: updated[0] || updated }, 200);
  } catch (err) {
    console.error('accept-ride error', err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: errorMsg }, 500);
  }
}
