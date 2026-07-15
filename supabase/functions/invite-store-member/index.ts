import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Role = 'manager' | 'attendant' | 'kitchen'
const VALID_ROLES: Role[] = ['manager', 'attendant', 'kitchen']

function genPassword(len = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length]
  return s
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const storeId: string = body.storeId
    const emailRaw: string = (body.email || '').trim().toLowerCase()
    const role: Role = body.role

    if (!storeId || !emailRaw || !role) throw new Error('Missing required fields')
    if (!VALID_ROLES.includes(role)) throw new Error('Invalid role')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) throw new Error('Invalid email')

    // Verify caller is store owner
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores').select('id, owner_id, name').eq('id', storeId).maybeSingle()
    if (storeErr || !store) throw new Error('Store not found')
    if (store.owner_id !== user.id) throw new Error('Only the store owner can invite members')

    // Find existing user by email — always (re)generate a temp password so
    // the owner can share fresh credentials with the invited member.
    let targetUserId: string | null = null
    const tempPassword: string = genPassword(12)

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles').select('id').eq('email', emailRaw).maybeSingle()

    if (existingProfile?.id) {
      targetUserId = existingProfile.id
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: tempPassword,
        email_confirm: true,
      })
      if (updErr) throw new Error(updErr.message)
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailRaw,
        password: tempPassword,
        email_confirm: true,
      })
      if (createErr || !created?.user) throw new Error(createErr?.message || 'Failed to create user')
      targetUserId = created.user.id
    }

    if (targetUserId === store.owner_id) throw new Error('This user is already the owner')

    // Upsert membership
    const { error: memberErr } = await supabaseAdmin
      .from('store_members')
      .upsert({ store_id: storeId, user_id: targetUserId, role, email: emailRaw }, { onConflict: 'store_id,user_id' })
    if (memberErr) throw new Error(memberErr.message)

    return new Response(
      JSON.stringify({
        success: true,
        userId: targetUserId,
        tempPassword,
        alreadyExisted: !tempPassword,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('invite-store-member error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})
