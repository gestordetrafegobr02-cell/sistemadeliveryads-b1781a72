import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function makeTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let createdUserId: string | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Configuração do servidor incompleta')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Sessão inválida' }, 401)

    const { data: isMaster, error: roleError } = await userClient.rpc('is_master_admin')
    if (roleError || isMaster !== true) return json({ error: 'Acesso restrito ao Master Admin' }, 403)

    const body = await req.json()
    const storeName = typeof body.storeName === 'string' ? body.storeName.trim() : ''
    const storeSlug = typeof body.storeSlug === 'string' ? body.storeSlug.trim().toLowerCase() : ''
    const loginEmail = typeof body.loginEmail === 'string' ? body.loginEmail.trim().toLowerCase() : ''
    const trialDays = Number(body.trialDays)
    const templateSlug = typeof body.templateSlug === 'string' && body.templateSlug ? body.templateSlug : null

    if (storeName.length < 2 || storeName.length > 120) throw new Error('Informe um nome de loja válido')
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug) || storeSlug.length > 80) throw new Error('Identificador da loja inválido')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail) || loginEmail.length > 254) throw new Error('E-mail provisório inválido')
    if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 365) throw new Error('Período de teste deve estar entre 0 e 365 dias')

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const temporaryPassword = makeTemporaryPassword()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { account_provisioned_by_master: true, store_name: storeName },
    })
    if (createError || !created.user) {
      throw new Error(createError?.message || 'Não foi possível criar o acesso provisório')
    }
    createdUserId = created.user.id

    // The auth trigger creates profiles synchronously. The user's JWT is retained
    // for this RPC because create_store_manual independently verifies Master Admin.
    const { data: storeId, error: storeError } = await userClient.rpc('create_store_manual', {
      p_store_name: storeName,
      p_store_slug: storeSlug,
      p_owner_email: loginEmail,
      p_trial_days: trialDays,
      p_template_slug: templateSlug,
    })
    if (storeError || !storeId) {
      await admin.auth.admin.deleteUser(createdUserId)
      createdUserId = null
      throw new Error(storeError?.message || 'Não foi possível vincular a loja à conta criada')
    }

    return json({
      success: true,
      storeId,
      loginEmail,
      temporaryPassword,
      message: 'Loja e acesso provisório criados. Guarde as credenciais: a senha será exibida somente nesta confirmação.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao criar loja'
    console.error('master-create-store:', message)
    return json({ error: message }, 400)
  }
})
