import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, optionsResponse } from '../lib/cors';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await request.json();
    const { requestId, driverId } = body;
    if (!requestId || !driverId) return jsonResponse({ error: 'requestId and driverId required' }, 400);

    const supabase = getSupabaseClient(env);

    const { data: updated, error: acceptError } = await supabase
      .from('ride_requests')
      .update({ driver_id: driverId, status: 'accepted' })
      .match({ id: requestId, status: 'pending' })
      .select();
    if (acceptError) throw acceptError;
    if (!updated || (Array.isArray(updated) && updated.length === 0)) return jsonResponse({ error: 'Request already accepted or not pending' }, 409);

    const { error: driverError } = await supabase
      .from('drivers')
      .update({ status: 'busy' })
      .eq('id', driverId);
    if (driverError) throw driverError;

    return jsonResponse({ ok: true, request: updated[0] || updated }, 200);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: errorMsg }, 500);
  }
}
