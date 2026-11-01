import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > 4096) {
    return json({ error: 'Request body too large' }, 413)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing required Supabase environment configuration')
      return json({ error: 'Server configuration error' }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    // Authorization is based on the server-managed admin role, not a client-supplied email.
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Admin role lookup failed:', roleError.message)
      return json({ error: 'Authorization could not be verified' }, 500)
    }
    if (!adminRole) return json({ error: 'Admin access required' }, 403)

    const rawBody = await req.text()
    if (rawBody.length > 4096) return json({ error: 'Request body too large' }, 413)

    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json({ error: 'Invalid request body' }, 400)
    }

    const { userId, newPassword } = body as Record<string, unknown>
    if (typeof userId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return json({ error: 'A valid userId is required' }, 400)
    }
    if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
      return json({ error: 'Password must contain between 12 and 128 characters' }, 400)
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      console.error('Password update failed:', updateError.message)
      return json({ error: 'Could not update password for the specified user' }, 400)
    }

    console.info('Password reset completed by an authorized admin')
    return json({ success: true, message: 'Password updated successfully' }, 200)
  } catch (error) {
    console.error('Admin reset password error:', error instanceof Error ? error.message : 'Unknown error')
    return json({ error: 'Internal server error' }, 500)
  }
})
