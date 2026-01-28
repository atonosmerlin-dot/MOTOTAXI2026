export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { proposalId, response, accept } = body;

    // Support both 'response' (new) and 'accept' (legacy) parameters
    const isAccepted = response === 'accepted' || accept === true;

    if (!proposalId) {
      return new Response(JSON.stringify({ error: 'proposalId required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    // Get the proposal details
    const proposalResp = await fetch(
      `${SUPABASE_URL}/rest/v1/ride_proposals?id=eq.${proposalId}&select=*`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!proposalResp.ok) {
      const error = await proposalResp.text();
      throw new Error(`Failed to fetch proposal: ${error}`);
    }

    const proposals = await proposalResp.json();
    if (!proposals || proposals.length === 0) {
      return new Response(JSON.stringify({ error: 'Proposal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const proposal = proposals[0];

    if (isAccepted) {
      // Accept the proposal: update ride_requests to mark as accepted, update proposals
      const updateRideResp = await fetch(
        `${SUPABASE_URL}/rest/v1/ride_requests?id=eq.${proposal.ride_id}&status=eq.pending`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            driver_id: proposal.driver_id,
            status: 'accepted',
            price: proposal.price
          }),
        }
      );

      if (!updateRideResp.ok) {
        const rideError = await updateRideResp.text();
        console.error('Failed to update ride:', rideError);
        // Ride may have already been accepted by someone else
        // Reject this proposal anyway
        await fetch(
          `${SUPABASE_URL}/rest/v1/ride_proposals?id=eq.${proposalId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ status: 'rejected' }),
          }
        );
        return new Response(JSON.stringify({ error: 'Ride already accepted by someone else' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Reject all other proposals for this ride
      await fetch(
        `${SUPABASE_URL}/rest/v1/ride_proposals?ride_id=eq.${proposal.ride_id}&id=neq.${proposalId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ status: 'rejected' }),
        }
      );

      // Mark this proposal as accepted
      await fetch(
        `${SUPABASE_URL}/rest/v1/ride_proposals?id=eq.${proposalId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ status: 'accepted' }),
        }
      );

      // Mark driver as busy
      await fetch(
        `${SUPABASE_URL}/rest/v1/drivers?id=eq.${proposal.driver_id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ status: 'busy' }),
        }
      );

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Reject the proposal
      const rejectResp = await fetch(
        `${SUPABASE_URL}/rest/v1/ride_proposals?id=eq.${proposalId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ status: 'rejected' }),
        }
      );

      if (!rejectResp.ok) {
        const error = await rejectResp.text();
        throw new Error(`Failed to reject proposal: ${error}`);
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in respond-proposal:', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
