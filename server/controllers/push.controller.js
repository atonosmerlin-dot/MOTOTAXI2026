import { supabase } from '../services/supabase.js';
import { getVapidPublicKey, sendNotification } from '../services/push.js';
import webpush from 'web-push';

export const getVapidPublic = (req, res) => {
    try {
        const pub = getVapidPublicKey();
        if (!pub) return res.status(404).json({ error: 'VAPID public key not configured' });
        return res.json({ publicKey: pub });
    } catch (err) {
        console.error('vapid-public error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const subscribe = async (req, res) => {
    const { driver_id, subscription } = req.body || {};
    if (!subscription) return res.status(400).json({ error: 'subscription required' });
    try {
        const row = {
            driver_id: driver_id || null,
            subscription: subscription,
            enabled: true,
            created_at: new Date().toISOString()
        };
        const { error } = await supabase.from('push_subscriptions').upsert(row, { onConflict: ['driver_id'] });
        if (error) throw error;
        return res.json({ ok: true });
    } catch (err) {
        console.error('subscribe error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const notifyAvailableDrivers = async (req, res) => {
    const { title, body, url } = req.body || {};
    try {
        const { data: drivers } = await supabase.from('drivers').select('id').eq('is_online', true);
        const driverIds = (drivers || []).map(d => d.id).filter(Boolean);

        if (!driverIds.length) return res.json({ ok: true, sent: 0 });

        const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('driver_id, subscription')
            .in('driver_id', driverIds)
            .eq('enabled', true);

        let sent = 0;
        for (const s of subs || []) {
            try {
                const payload = JSON.stringify({ title: title || 'Nova corrida disponível', body: body || 'Um novo pedido foi feito. Toque para aceitar.', url: url || '/' });
                await sendNotification(s.subscription, payload);
                sent++;
            } catch (e) {
                console.warn('push send error for', s.driver_id, e);
            }
        }

        return res.json({ ok: true, sent });
    } catch (err) {
        console.error('notify-available-drivers error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const getPushStats = async (req, res) => {
    try {
        const { count, error } = await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('enabled', true);
        if (error) throw error;
        return res.json({ enabledSubscriptions: count || 0 });
    } catch (err) {
        console.error('push-stats error', err);
        return res.status(500).json({ error: err.message || err });
    }
};

export const sendPush = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { subscriptions, payload } = req.body;
        if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
            return res.status(400).json({ error: 'subscriptions array required' });
        }
        if (!payload) return res.status(400).json({ error: 'payload required' });

        console.log(`[SEND-PUSH] outbox: ${subscriptions.length}`);
        let sent = 0;
        let failed = 0;
        const errors = [];

        await Promise.all(
            subscriptions.map(async (sub) => {
                try {
                    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
                        failed++;
                        errors.push('Invalid subscription structure');
                        return;
                    }
                    await webpush.sendNotification(sub, payload, {
                        TTL: 86400,
                        headers: { 'Urgency': 'high' }
                    });
                    sent++;
                } catch (error) {
                    failed++;
                    const msg = error?.message || String(error);
                    if (msg.includes('410')) errors.push('410 Gone');
                    else if (msg.includes('401')) errors.push('401 Unauthorized');
                    else errors.push(msg);
                }
            })
        );

        return res.status(200).json({ ok: sent > 0, sent, failed, errors: [...new Set(errors)] });
    } catch (error) {
        console.error('[SEND-PUSH] Error:', error);
        return res.status(500).json({ error: error?.message });
    }
};
