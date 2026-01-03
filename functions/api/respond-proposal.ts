import { getSupabaseClient } from '../lib/supabase';
import { jsonResponse, optionsResponse } from '../lib/cors';

export async function onRequest(context: any) {
  const { request } = context;

  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await request.json();
    const { proposalId, accept } = body;

    if (!proposalId || typeof accept === 'undefined') {
      return new Response(
        JSON.stringify({ error: 'proposalId and accept required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();

    const { data: proposal, error: propErr } = await supabase
      .from('ride_proposals')
      .select('*')
      .eq('id', proposalId)
      .maybeSingle();

    if (propErr) throw propErr;
    if (!proposal) {
      return new Response(JSON.stringify({ error: 'proposal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (accept) {
      // Attempt atomic accept if still pending
      const { data: updatedRide, error: acceptErr } = await supabase
        .from('ride_requests')
        .update({ driver_id: proposal.driver_id, status: 'accepted' })
        .match({ id: proposal.ride_id, status: 'pending' })
        .select();

      if (acceptErr) throw acceptErr;
      if (!updatedRide || (Array.isArray(updatedRide) && updatedRide.length === 0)) {
        // Could not accept (someone beat them)
        const { error: rejErr } = await supabase
          .from('ride_proposals')
          .update({ status: 'rejected' })
          .eq('id', proposalId);
        if (rejErr) throw rejErr;
        return new Response(JSON.stringify({ error: 'Ride already accepted by someone else' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mark this proposal as accepted and others as rejected
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

      // Mark driver busy
      const { error: driverErr } = await supabase
        .from('drivers')
        .update({ status: 'busy' })
        .eq('id', proposal.driver_id);
      if (driverErr) throw driverErr;

      return jsonResponse({ ok: true, request: updatedRide[0] || updatedRide }, 200);
    } else {
      // Reject a proposal
      const { error } = await supabase
        .from('ride_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);
      if (error) throw error;
      return jsonResponse({ ok: true }, 200);
    }
  } catch (err) {
    console.error('respond-proposal error', err);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: errorMsg }, 500);
  }
}
