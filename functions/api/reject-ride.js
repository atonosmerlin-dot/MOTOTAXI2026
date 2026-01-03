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

    const { error: insErr } = await supabase
      .from('ride_rejections')
      .insert({ ride_id: requestId, driver_id: driverId });
    if (insErr) throw insErr;

    const { data: onlineDrivers, error: onlineErr } = await supabase
      .from('drivers')
      .select('id')
      .eq('is_online', true);
    if (onlineErr) throw onlineErr;
    const onlineCount = (onlineDrivers || []).length;

    const { data: rejs, error: rejErr } = await supabase
      .from('ride_rejections')
      .select('driver_id')
      .eq('ride_id', requestId);
    if (rejErr) throw rejErr;

    if (onlineCount > 0 && (rejs || []).length >= onlineCount) {
      const { error: cancelErr } = await supabase
        .from('ride_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);
      if (cancelErr) throw cancelErr;
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: errorMsg }, 500);
  }
}
