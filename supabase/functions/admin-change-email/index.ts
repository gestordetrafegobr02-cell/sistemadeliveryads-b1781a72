import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized: Could not verify user')

    const MASTER_EMAIL = 'igormoises.ads@gmail.com'
    if (user.email !== MASTER_EMAIL) {
      throw new Error('Unauthorized: Master admin access required')
    }

    const { userId, newEmail } = await req.json()

    if (!userId || !newEmail) {
      throw new Error('Missing required fields: userId and newEmail')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const clean = String(newEmail).trim().toLowerCase()
    if (!emailRegex.test(clean) || clean.length > 254) {
      throw new Error('Email inválido')
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: clean, email_confirm: true }
    )

    if (updateError) {
      throw new Error(`Failed to update email: ${updateError.message}`)
    }

    // Keep profiles.email in sync
    await supabaseAdmin.from('profiles').update({ email: clean }).eq('id', userId)

    console.log(`Email updated for user ${userId} to ${clean} by master admin`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('admin-change-email error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
