// Supabase Edge Function to create a driver (auth user + profile + driver + user_role)
// Deploy with: `supabase functions deploy create-driver --project-ref <PROJECT_ID>`

import { serve } from 'std/server'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
}

serve(async (req) => {
  try {
    const body = await req.json()
    const { 
      email, password, name, 
      photo_url, 
      moto_brand, moto_model, moto_color, moto_plate 
    } = body || {}
    
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'email, password and name are required' }), { status: 400 })
    }

    // 1) create auth user via Admin API
    const createUserResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } })
    })

    const createUserJson = await createUserResp.json()
    if (!createUserResp.ok) {
      return new Response(JSON.stringify({ error: createUserJson }), { status: createUserResp.status })
    }

    const userId = createUserJson.id
    if (!userId) return new Response(JSON.stringify({ error: 'user id not returned' }), { status: 500 })

    // helper to insert via PostgREST
    async function insertTable(table: string, payload: any) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      })
      const j = await r.json()
      if (!r.ok) throw j
      return j
    }

    // 2) create profile with photo_url
    await insertTable('profiles', { 
      id: userId, 
      name,
      photo_url: photo_url || null
    })

    // 3) create driver with motorcycle details
    await insertTable('drivers', { 
      user_id: userId,
      moto_brand: moto_brand || null,
      moto_model: moto_model || null,
      moto_color: moto_color || null,
      moto_plate: moto_plate || null
    })

    // 4) add role
    await insertTable('user_roles', { user_id: userId, role: 'driver' })

    return new Response(JSON.stringify({ ok: true, userId }), { status: 200 })
  } catch (err) {
    console.error('create-driver error', err)
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 })
  }
})
