import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LeadNotification {
  storeName: string;
  email: string;
  phone?: string;
  segment?: string;
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 8192) return jsonResponse({ error: 'Request body too large' }, 413);

    const rawBody = await req.text();
    if (!rawBody || new TextEncoder().encode(rawBody).byteLength > 8192) {
      return jsonResponse({ error: 'Invalid request body size' }, 413);
    }

    let body: LeadNotification;
    try {
      body = JSON.parse(rawBody) as LeadNotification;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const storeName = typeof body?.storeName === 'string' ? body.storeName.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const segment = typeof body?.segment === 'string' ? body.segment.trim() : 'Hamburgueria';

    if (!storeName || !email) return jsonResponse({ error: 'storeName and email are required' }, 400);
    if (storeName.length > 100 || email.length > 200 || phone.length > 20 || segment.length > 50) {
      return jsonResponse({ error: 'Input exceeds maximum length' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Invalid email format' }, 400);
    }

    const sanitize = (value: string) =>
      Array.from(value).filter((character) => {
        const code = character.charCodeAt(0);
        return code > 31 && code !== 127;
      }).join('');

    const cleanStoreName = sanitize(storeName);
    const cleanEmail = sanitize(email);
    const cleanPhone = phone ? sanitize(phone) : '';
    const cleanSegment = sanitize(segment) || 'Hamburgueria';

    // This public endpoint must not call an authenticated-only RPC with the anon key.
    // Read only the one allow-listed notification setting with the server-side key.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[notify-lead] Server configuration is incomplete.');
      return jsonResponse({ error: 'Lead notification is temporarily unavailable' }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: setting, error: settingError } = await admin
      .from('global_settings')
      .select('value')
      .eq('key', 'owner_whatsapp')
      .maybeSingle();

    if (settingError) {
      console.error('[notify-lead] Could not read notification destination.');
      return jsonResponse({ error: 'Lead notification is temporarily unavailable' }, 503);
    }

    const targetWhatsApp = String(setting?.value ?? '').replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(targetWhatsApp)) {
      return jsonResponse({ error: 'Lead notification is not configured' }, 503);
    }

    const message = [
      '🔔 *NOVO LEAD CADASTRADO!*',
      '',
      `📍 *Loja:* ${cleanStoreName}`,
      `📧 *E-mail:* ${cleanEmail}`,
      `📱 *Telefone:* ${cleanPhone || 'Não informado'}`,
      `🏪 *Segmento:* ${cleanSegment}`,
      '',
      '---',
      '_Notificação automática do DeliveryPro_',
    ].join('\n');

    const whatsappUrl = `https://wa.me/${targetWhatsApp}?text=${encodeURIComponent(message)}`;
    return jsonResponse({ success: true, whatsappUrl, message: 'Lead notification prepared successfully' });
  } catch {
    console.error('[notify-lead] Unexpected request processing failure.');
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
