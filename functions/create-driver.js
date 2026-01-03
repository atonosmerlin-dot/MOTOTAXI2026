// Cloudflare Pages Function to create a driver (auth user + profile + driver + user_role)

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const body = await request.json();
    const { 
      email, password, name,
      photo_url,
      moto_brand, moto_model, moto_color, moto_plate 
    } = body || {};

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'email, password and name are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 1) Create auth user via Admin API
    const createUserResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ 
        email, 
        password, 
        email_confirm: true, 
        user_metadata: { name } 
      })
    });

    const createUserJson = await createUserResp.json();
    if (!createUserResp.ok) {
      const errorMsg = createUserJson?.msg || createUserJson?.error_description || JSON.stringify(createUserJson);
      console.error('Auth error:', errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: createUserResp.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const userId = createUserJson.id;
    if (!userId) {
      console.error('No user ID returned from auth');
      return new Response(JSON.stringify({ error: 'user id not returned' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Helper to insert via PostgREST
    async function insertTable(table, payload) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!r.ok) {
        console.error(`Error inserting into ${table}:`, j);
        throw new Error(j?.message || j?.error_description || JSON.stringify(j));
      }
      return j;
    }

    // 2) Create profile with photo_url
    try {
      await insertTable('profiles', { 
        id: userId, 
        name,
        photo_url: photo_url || null
      });
    } catch (e) {
      console.error('Profile insert error:', e);
      throw e;
    }

    // 3) Create driver with motorcycle details
    try {
      await insertTable('drivers', { 
        user_id: userId,
        moto_brand: moto_brand || null,
        moto_model: moto_model || null,
        moto_color: moto_color || null,
        moto_plate: moto_plate || null
      });
    } catch (e) {
      console.error('Driver insert error:', e);
      throw e;
    }

    // 4) Add role
    try {
      await insertTable('user_roles', { user_id: userId, role: 'driver' });
    } catch (e) {
      console.error('User role insert error:', e);
      throw e;
    }

    return new Response(JSON.stringify({ ok: true, userId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('create-driver error', err);
    const errorMessage = err?.message || String(err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
