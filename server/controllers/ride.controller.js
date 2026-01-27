import { supabase } from '../services/supabase.js';

export const acceptRide = async (req, res) => {
    const { requestId, driverId } = req.body || {};
    if (!requestId || !driverId) return res.status(400).json({ error: 'requestId and driverId required' });

    try {
        // atomically set to accepted only if still pending
        const { data: updated, error: acceptError } = await supabase
            .from('ride_requests')
            .update({ driver_id: driverId, status: 'accepted' })
            .match({ id: requestId, status: 'pending' })
            .select();

        if (acceptError) throw acceptError;
        if (!updated || (Array.isArray(updated) && updated.length === 0)) {
            return res.status(409).json({ error: 'Request already accepted or not pending' });
        }

        // mark driver busy
        const { error: driverError } = await supabase
            .from('drivers')
            .update({ status: 'busy' })
            .eq('id', driverId);
        if (driverError) throw driverError;

        return res.json({ ok: true, request: updated[0] || updated });
    } catch (err) {
        console.error('accept-ride error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const rejectRide = async (req, res) => {
    const { requestId, driverId } = req.body || {};
    if (!requestId || !driverId) return res.status(400).json({ error: 'requestId and driverId required' });

    try {
        const { error: insErr } = await supabase
            .from('ride_rejections')
            .insert({ ride_id: requestId, driver_id: driverId });
        if (insErr) throw insErr;

        // count online drivers
        const { data: onlineDrivers, error: onlineErr } = await supabase
            .from('drivers')
            .select('id')
            .eq('is_online', true);
        if (onlineErr) throw onlineErr;
        const onlineCount = (onlineDrivers || []).length;

        // count rejections for this ride
        const { data: rejs, error: rejErr } = await supabase
            .from('ride_rejections')
            .select('driver_id')
            .eq('ride_id', requestId);
        if (rejErr) throw rejErr;

        if (onlineCount > 0 && (rejs || []).length >= onlineCount) {
            // cancel the ride
            const { error: cancelErr } = await supabase
                .from('ride_requests')
                .update({ status: 'cancelled' })
                .eq('id', requestId);
            if (cancelErr) throw cancelErr;
        }

        return res.json({ ok: true });
    } catch (err) {
        console.error('reject-ride error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const proposePrice = async (req, res) => {
    const { requestId, driverId, price } = req.body || {};
    if (!requestId || !driverId || typeof price === 'undefined') return res.status(400).json({ error: 'requestId, driverId and price required' });
    try {
        const { data: ride, error: rideErr } = await supabase
            .from('ride_requests')
            .select('id,status')
            .eq('id', requestId)
            .maybeSingle();
        if (rideErr) throw rideErr;
        if (!ride) return res.status(404).json({ error: 'ride not found' });
        if (ride.status !== 'pending') return res.status(409).json({ error: 'ride not pending' });

        const { data, error } = await supabase
            .from('ride_proposals')
            .insert({ ride_id: requestId, driver_id: driverId, price })
            .select()
            .limit(1);
        if (error) throw error;

        // touch the parent ride row
        try {
            await supabase
                .from('ride_requests')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', requestId);
        } catch (e) {
            console.warn('Could not touch ride_requests.updated_at', e);
        }
        return res.json((data && data[0]) || null);
    } catch (err) {
        console.error('propose-price error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const respondProposal = async (req, res) => {
    const { proposalId, response, accept } = req.body || {};
    const shouldAccept = response === 'accepted' || accept === true;

    if (!proposalId || (response === undefined && accept === undefined)) {
        return res.status(400).json({ error: 'proposalId and (response or accept) required' });
    }
    try {
        const { data: proposal, error: propErr } = await supabase
            .from('ride_proposals')
            .select('*')
            .eq('id', proposalId)
            .maybeSingle();
        if (propErr) throw propErr;
        if (!proposal) return res.status(404).json({ error: 'proposal not found' });

        if (shouldAccept) {
            const { data: updatedRide, error: acceptErr } = await supabase
                .from('ride_requests')
                .update({
                    driver_id: proposal.driver_id,
                    status: 'accepted',
                    price: proposal.price
                })
                .match({ id: proposal.ride_id, status: 'pending' })
                .select();
            if (acceptErr) throw acceptErr;
            if (!updatedRide || (Array.isArray(updatedRide) && updatedRide.length === 0)) {
                const { error: rejErr } = await supabase
                    .from('ride_proposals')
                    .update({ status: 'rejected' })
                    .eq('id', proposalId);
                if (rejErr) throw rejErr;
                return res.status(409).json({ error: 'Ride already accepted by someone else' });
            }

            await supabase.from('ride_proposals').update({ status: 'rejected' }).eq('ride_id', proposal.ride_id);
            await supabase.from('ride_proposals').update({ status: 'accepted' }).eq('id', proposalId);
            await supabase.from('drivers').update({ status: 'busy' }).eq('id', proposal.driver_id);

            return res.json({ ok: true, request: updatedRide[0] || updatedRide });
        } else {
            const { error } = await supabase.from('ride_proposals').update({ status: 'rejected' }).eq('id', proposalId);
            if (error) throw error;
            return res.json({ ok: true });
        }
    } catch (err) {
        console.error('respond-proposal error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const updatePrice = async (req, res) => {
    const { requestId, driverId, price } = req.body || {};
    if (!requestId || !driverId || !price) return res.status(400).json({ error: 'requestId, driverId and price required' });

    try {
        const { data, error } = await supabase
            .from('ride_requests')
            .update({ price: price })
            .eq('id', requestId)
            .eq('driver_id', driverId)
            .select();

        if (error) throw error;
        return res.json({ ok: true, data });
    } catch (err) {
        console.error('update-price error', err);
        return res.status(500).json({ error: err.message || err });
    }
};
