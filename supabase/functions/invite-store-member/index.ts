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

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error('Service unavailable')

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const storeId = body.storeId
    const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const role = body.role as Role

    if (!isUuid(storeId) || !emailRaw || emailRaw.length > 254 || !role) {
      throw new Error('Missing or invalid required fields')
    }
    if (!VALID_ROLES.includes(role)) throw new Error('Invalid role')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) throw new Error('Invalid email')

    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores').select('id, owner_id, name').eq('id', storeId).maybeSingle()
    if (storeErr || !store) throw new Error('Store not found')
    if (store.owner_id !== user.id) throw new Error('Only the store owner can invite members')

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles').select('id').eq('email', emailRaw).maybeSingle()
    if (profileError) throw new Error('Could not verify the invited account')

    let targetUserId: string
    let tempPassword: string | null = null
    const alreadyExisted = !!existingProfile?.id

    if (existingProfile?.id) {
      targetUserId = existingProfile.id

      if (targetUserId === store.owner_id) throw new Error('This user is already the owner')

      const { data: platformAdmin, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('user_id', targetUserId)
        .eq('role', 'admin')
        .maybeSingle()
      if (roleError) throw new Error('Could not verify the invited account permissions')
      if (platformAdmin) throw new Error('Platform administrators cannot be invited as store members')

      // Password regeneration is allowed only for a member who belongs exclusively
      // to this store. A store owner must never reset another tenant's shared login.
      const [
        { data: currentMembership, error: currentMembershipError },
        { data: allMemberships, error: allMembershipsError },
        { data: ownedStores, error: ownedStoresError },
      ] = await Promise.all([
        supabaseAdmin.from('store_members').select('id').eq('store_id', storeId).eq('user_id', targetUserId).maybeSingle(),
        supabaseAdmin.from('store_members').select('id').eq('user_id', targetUserId),
        supabaseAdmin.from('stores').select('id').eq('owner_id', targetUserId),
      ])
      if (currentMembershipError || allMembershipsError || ownedStoresError) {
        throw new Error('Could not verify the invited account membership')
      }

      const belongsOnlyToThisStore =
        !!currentMembership &&
        (allMemberships?.length ?? 0) === 1 &&
        (ownedStores?.length ?? 0) === 0

      if (belongsOnlyToThisStore) {
        tempPassword = genPassword(12)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password: tempPassword,
        })
        if (updateError) throw new Error(updateError.message)
      }
    } else {
      tempPassword = genPassword(12)
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailRaw,
        password: tempPassword,
        email_confirm: true,
      })
      if (createErr || !created?.user) throw new Error(createErr?.message || 'Failed to create user')
      targetUserId = created.user.id
    }

    const { error: memberErr } = await supabaseAdmin
      .from('store_members')
      .upsert({ store_id: storeId, user_id: targetUserId, role, email: emailRaw }, { onConflict: 'store_id,user_id' })

    if (memberErr) {
      if (!alreadyExisted) {
        await supabaseAdmin.auth.admin.deleteUser(targetUserId)
      }
      throw new Error(memberErr.message)
    }

    return new Response(JSON.stringify({
      success: true,
      userId: targetUserId,
      alreadyExisted,
      ...(tempPassword ? { tempPassword } : { credentialsRequired: false }),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('invite-store-member error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
