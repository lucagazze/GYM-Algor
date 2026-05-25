import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is authenticated
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Sin autorización' }, 401)

    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Token inválido' }, 401)

    // Verify caller is admin
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return json({ error: 'Acceso denegado' }, 403)

    const { username, password, display_name } = await req.json()
    if (!username?.trim() || !password?.trim()) return json({ error: 'Faltan datos' }, 400)

    const slug = username.toLowerCase().trim().replace(/\s+/g, '_')
    const email = `${slug}@algorlift.app`

    // Create user in Supabase Auth
    const { data, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) return json({ error: createErr.message }, 400)

    // Create profile
    await admin.from('profiles').insert({
      id: data.user.id,
      username: slug,
      display_name: display_name?.trim() || slug,
      is_admin: false,
    })

    return json({ success: true, username: slug, user_id: data.user.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
