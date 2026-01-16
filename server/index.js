import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Configure VAPID keys for web-push (required to send push notifications)
let VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC;
let VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;

async function ensureVapidKeys() {
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails('mailto:admin@motopoint.local', VAPID_PUBLIC, VAPID_PRIVATE);
    return;
  }

  // In development, generate a keypair automatically and persist to .env.vapid
  try {
    console.warn('VAPID keys not found in environment. Generating ephemeral keys...');
    const keys = webpush.generateVAPIDKeys();
    VAPID_PUBLIC = keys.publicKey;
    VAPID_PRIVATE = keys.privateKey;
    webpush.setVapidDetails('mailto:admin@motopoint.local', VAPID_PUBLIC, VAPID_PRIVATE);

    // Persist to a .env.vapid file so developer can copy them into their env
    // Do not overwrite an existing file
    const fs = await import('fs');
    const path = await import('path');
    const outPath = path.join(process.cwd(), '.env.vapid');
    if (!fs.existsSync(outPath)) {
      const content = `# Generated VAPID keys - add these to your environment (keep private!)\nVAPID_PUBLIC_KEY=${VAPID_PUBLIC}\nVAPID_PRIVATE_KEY=${VAPID_PRIVATE}\nVITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC}\n`;
      try {
        fs.writeFileSync(outPath, content, { encoding: 'utf8', flag: 'wx' });
        console.info('Generated VAPID keys and saved to .env.vapid');
      } catch (e) {
        console.warn('Could not write .env.vapid', e);
      }
    } else {
      console.info('.env.vapid already exists; not overwriting.');
    }
  } catch (e) {
    console.error('Failed to generate VAPID keys', e);
    console.warn('Push notifications will not work until VAPID keys are configured.');
  }
}

// Ensure keys synchronously-ish at startup
ensureVapidKeys();

// Create driver endpoint: creates auth user, profile, drivers and user_roles
app.post('/create-driver', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).json({ error: 'email, password and name are required' });

  try {
    // 1) create user via admin API
    let userId;
    try {
      const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      });
      if (createUserError) throw createUserError;

      // supabase admin.createUser response shape can vary between sdk versions
      // try several known locations for the created user's id
      userId = userData?.id || userData?.user?.id || userData?.user?.sub || userData?.sub;
      if (!userId) {
        console.error('createUser response did not include id:', JSON.stringify(userData));
        throw new Error('user id not returned');
      }
    } catch (createErr) {
      // If the email already exists, retrieve the existing user and continue
      if (createErr?.code === 'email_exists' || createErr?.status === 422 || (createErr?.message || '').includes('already been registered')) {
        console.warn('createUser: email already exists, attempting to lookup existing user');
        const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw listErr;
        // listUsers shape varies: newer SDK returns { users: [...] }
        const candidates = usersList?.users || usersList || [];
        const existing = candidates.find(u => u.email === email || u.user?.email === email || u.email === email);
        userId = existing?.id || existing?.user?.id || existing?.sub || existing?.user?.sub;
        if (!userId) {
          console.error('Could not find existing user for email:', email, 'listUsers result:', JSON.stringify(candidates?.slice?.(0,5) || candidates));
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }

    // 2) ensure profile exists (use upsert to avoid unique constraint errors)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, name })
      .select();
    if (profileError) throw profileError;

    // 3) ensure driver record exists
    const { data: existingDriver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', userId)
      .limit(1);
    if (!existingDriver || existingDriver.length === 0) {
      const { error: driverError } = await supabase
        .from('drivers')
        .insert({ user_id: userId })
        .select();
      if (driverError) throw driverError;
    }

    // 4) ensure user_roles contains driver role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role', 'driver')
      .limit(1);
    if (!existingRole || existingRole.length === 0) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'driver' })
        .select();
      if (roleError) throw roleError;
    }

    return res.json({ ok: true, userId });
  } catch (err) {
    console.error('create-driver error', err);
    return res.status(500).json({ error: err.message || err });
  }
});

// Accept ride endpoint - atomic accept if still pending
app.post('/accept-ride', async (req, res) => {
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
});

// Reject ride endpoint - record rejection and if all online drivers rejected, cancel the ride
app.post('/reject-ride', async (req, res) => {
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
      // cancel the ride (map to 'cancelled')
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
});

// Public API: get point details (used by QR scanner)
app.get('/api/point/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const { data: point, error: pointErr } = await supabase
      .from('fixed_points')
      .select('*, name, address, latitude, longitude, is_active')
      .eq('id', id)
      .maybeSingle();
    if (pointErr) throw pointErr;
    if (!point) return res.status(404).json({ error: 'not found' });
    return res.json(point);
  } catch (err) {
    console.error('api/point error', err);
    return res.status(500).json({ error: err.message || err });
  }
});

// Save a push subscription (called by client after subscribing)
app.post('/api/subscribe', async (req, res) => {
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
});

// Public endpoint to return the VAPID public key for clients
app.get('/api/vapid-public', async (req, res) => {
  try {
    const pub = VAPID_PUBLIC || process.env.VITE_VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC || null;
    if (!pub) return res.status(404).json({ error: 'VAPID public key not configured' });
    return res.json({ publicKey: pub });
  } catch (err) {
    console.error('vapid-public error', err);
    return res.status(500).json({ error: err.message || err });
  }
});

// Admin or server: notify available drivers via push
app.post('/api/notify-available-drivers', async (req, res) => {
  const { title, body, url } = req.body || {};
  try {
    // find online drivers
    const { data: drivers } = await supabase.from('drivers').select('id').eq('is_online', true);
    const driverIds = (drivers || []).map(d => d.id).filter(Boolean);

    if (!driverIds.length) return res.json({ ok: true, sent: 0 });

    // fetch subscriptions for these drivers
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('driver_id, subscription')
      .in('driver_id', driverIds)
      .eq('enabled', true);

    let sent = 0;
    for (const s of subs || []) {
      try {
        const payload = JSON.stringify({ title: title || 'Nova corrida disponível', body: body || 'Um novo pedido foi feito. Toque para aceitar.', url: url || '/' });
        await webpush.sendNotification(s.subscription, payload);
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
});

// Admin: push stats
app.get('/api/push-stats', async (req, res) => {
  try {
    const { count, error } = await supabase.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('enabled', true);
    if (error) throw error;
    return res.json({ enabledSubscriptions: count || 0 });
  } catch (err) {
    console.error('push-stats error', err);
    return res.status(500).json({ error: err.message || err });
  }
});

// Note: zone/price admin endpoints removed as zones/prices feature was deprecated

// Driver proposes a price for a pending ride (creates a proposal)
app.post('/propose-price', async (req, res) => {
  const { requestId, driverId, price } = req.body || {};
  if (!requestId || !driverId || typeof price === 'undefined') return res.status(400).json({ error: 'requestId, driverId and price required' });
  try {
    // ensure ride is still pending
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
    // touch the parent ride row to trigger realtime listeners that watch ride_requests
    try {
      await supabase
        .from('ride_requests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', requestId);
    } catch (e) {
      console.warn('Could not touch ride_requests.updated_at after creating proposal', e);
    }
    return res.json((data && data[0]) || null);
  } catch (err) {
    console.error('propose-price error', err);
    return res.status(500).json({ error: err.message || err });
  }
});

// Client responds to a proposal (accept or reject)
app.post('/respond-proposal', async (req, res) => {
  const { proposalId, response, accept } = req.body || {};
  // Support both 'response' (new format) and 'accept' (legacy) for backward compatibility
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
      // Attempt to atomically accept the ride for this driver if still pending
      const { data: updatedRide, error: acceptErr } = await supabase
        .from('ride_requests')
        .update({ driver_id: proposal.driver_id, status: 'accepted' })
        .match({ id: proposal.ride_id, status: 'pending' })
        .select();
      if (acceptErr) throw acceptErr;
      if (!updatedRide || (Array.isArray(updatedRide) && updatedRide.length === 0)) {
        // Could not accept (someone else beat them)
        // mark this proposal as rejected
        const { error: rejErr } = await supabase
          .from('ride_proposals')
          .update({ status: 'rejected' })
          .eq('id', proposalId);
        if (rejErr) throw rejErr;
        return res.status(409).json({ error: 'Ride already accepted by someone else' });
      }

      // mark proposal as accepted and others as rejected
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

      // mark driver busy
      const { error: driverErr } = await supabase
        .from('drivers')
        .update({ status: 'busy' })
        .eq('id', proposal.driver_id);
      if (driverErr) throw driverErr;

      return res.json({ ok: true, request: updatedRide[0] || updatedRide });
    } else {
      // reject a proposal
      const { error } = await supabase
        .from('ride_proposals')
        .update({ status: 'rejected' })
        .eq('id', proposalId);
      if (error) throw error;
      return res.json({ ok: true });
    }
  } catch (err) {
    console.error('respond-proposal error', err);
    return res.status(500).json({ error: err.message || err });
  }
});

// Background job: expire old pending rides
const RIDE_TTL_SECONDS = parseInt(process.env.RIDE_TTL_SECONDS || '60', 10);
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - RIDE_TTL_SECONDS * 1000).toISOString();
    const { data: expired, error } = await supabase
      .from('ride_requests')
      .update({ status: 'cancelled' })
      .lt('created_at', cutoff)
      .eq('status', 'pending')
      .select();
    if (error) throw error;
    if (expired && expired.length) console.log('Expired rides:', expired.map(r => r.id));
  } catch (e) {
    console.error('Error expiring rides', e);
  }
}, Math.max(10000, Math.floor(RIDE_TTL_SECONDS / 3) * 1000));

// Endpoint para enviar notificações push via web-push (roda em Node.js onde https.request está disponível)
app.post('/send-push', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscriptions, payload } = req.body;

    if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(400).json({ error: 'subscriptions array required' });
    }

    if (!payload) {
      return res.status(400).json({ error: 'payload required' });
    }

    console.log(`[SEND-PUSH] 📤 Enviando para ${subscriptions.length} dispositivos...`);

    let sent = 0;
    let failed = 0;
    const errors = [];

    // Enviar em paralelo com Promise.all
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          // Validação
          if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
            failed++;
            errors.push('Invalid subscription structure');
            return;
          }

          // Envio via web-push (roda em Node.js, https.request disponível)
          await webpush.sendNotification(sub, payload);
          sent++;
          console.log('[SEND-PUSH] ✅ Enviada com sucesso');
        } catch (error) {
          failed++;
          const msg = error?.message || String(error);
          console.error('[SEND-PUSH] ❌ Erro:', msg);
          
          if (msg.includes('410')) errors.push('410 Gone (Subscription expirada)');
          else if (msg.includes('401')) errors.push('401 Unauthorized');
          else errors.push(msg);
        }
      })
    );

    console.log(`[SEND-PUSH] ✅ Resultado: ${sent} enviadas, ${failed} falhadas`);

    return res.status(200).json({
      ok: sent > 0,
      sent,
      failed,
      total: subscriptions.length,
      errors: [...new Set(errors)],
    });
  } catch (error) {
    console.error('[SEND-PUSH] Erro crítico:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
