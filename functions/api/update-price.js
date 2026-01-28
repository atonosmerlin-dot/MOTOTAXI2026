
import { getSupabaseClient } from '../lib/supabase';

export const onRequest = async (context) => {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    try {
        const body = await request.json();
        const { requestId, driverId, price } = body || {};

        if (!requestId || !driverId || !price) {
            return new Response(JSON.stringify({ error: 'requestId, driverId and price required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const supabase = getSupabaseClient(env);

        const { data, error } = await supabase
            .from('ride_requests')
            .update({ price: price })
            .eq('id', requestId)
            .eq('driver_id', driverId)
            .select();

        if (error) throw error;

        return new Response(JSON.stringify({ ok: true, data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (err) {
        console.error('update-price error', err);
        return new Response(JSON.stringify({ error: err.message || String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
};
