import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, optionsResponse } from '../lib/cors';

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await request.json();
    const { proposalId, accept } = body;
    if (!proposalId || typeof accept === 'undefined') return jsonResponse({ error: 'proposalId and accept required' }, 400);

    const supabase = getSupabaseClient(env);

    const { data: proposal, error: propErr } = await supabase
      .from('ride_proposals')
      .select('*')
      .eq('id', proposalId)
      .maybeSingle();
    if (propErr) throw propErr;
    if (!proposal) return jsonResponse({ error: 'proposal not found' }, 404);

    if (accept) {
      const { data: updatedRide, error: acceptErr } = await supabase
        .from('ride_requests')
        .update({ driver_id: proposal.driver_id, status: 'accepted' })
        .match({ id: proposal.ride_id, status: 'pending' })
        .select();
      if (acceptErr) throw acceptErr;
      if (!updatedRide || (Array.isArray(updatedRide) && updatedRide.length === 0)) {
        const { error: rejErr } = await supabase
          .from('ride_proposals')
          .update({ status: 'rejected' })
          .eq('id', proposalId);
        if (rejErr) throw rejErr;
        return jsonResponse({ error: 'Ride already accepted by someone else' }, 409);
      }

      const { error: updatePropsErr } = await supabase
        .from('ride_proposals')
        .update({ status: 'rejected' })
        .eq('ride_id', proposal.ride_id);
      if (updatePropsErr) throw updatePropsErr;

      const { error: markAcceptedErr } = await supabase
        .from('ride_proposals')
        .update({ status: 'accepted' })
        .eq('id', proposalId);
      if (markAcceptedErr) throw markAcceptedErr;

      const { error: driverErr } = await supabase
        .from('drivers')
        .update({ status: 'busy' })
        .eq('id', proposal.driver_id);
      if (driverErr) throw driverErr;

      return jsonResponse({ ok: true, request: updatedRide[0] || updatedRide }, 200);
    } else {
      const { error } = await supabase
        .from('ride_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);
      if (error) throw error;
      return jsonResponse({ ok: true }, 200);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: errorMsg }, 500);
  }
}
