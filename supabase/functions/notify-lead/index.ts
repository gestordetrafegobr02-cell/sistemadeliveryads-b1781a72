import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface LeadNotification {
  storeName: string;
  email: string;
  phone?: string;
  segment?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' },
    });
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 8192) {
    return new Response(JSON.stringify({ error: 'Request body too large' }), {
      status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.length > 8192) {
      return new Response(JSON.stringify({ error: 'Invalid request body size' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let body: LeadNotification;
    try {
      body = JSON.parse(rawBody) as LeadNotification;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { storeName, email, phone, segment } = body;

    // Validate required fields
    if (!storeName || !email) {
      return new Response(
        JSON.stringify({ error: 'storeName and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce length limits
    if (storeName.length > 100 || email.length > 200 ||
        (phone && phone.length > 20) || (segment && segment.length > 50)) {
      return new Response(
        JSON.stringify({ error: 'Input exceeds maximum length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize control characters
    const sanitize = (str: string) => str.replace(/[\x00-\x1F\x7F]/g, '');
    const cleanStoreName = sanitize(storeName);
    const cleanEmail = sanitize(email);
    const cleanPhone = phone ? sanitize(phone) : undefined;
    const cleanSegment = segment ? sanitize(segment) : 'Hamburgueria';

    console.log('[notify-lead] Received lead notification request:', { storeName: cleanStoreName, email: cleanEmail, segment: cleanSegment });

    // Get the owner WhatsApp number from global settings
    const { data: ownerWhatsApp, error: settingsError } = await supabase.rpc('get_global_setting', {
      setting_key: 'owner_whatsapp'
    });

    if (settingsError) {
      console.error('[notify-lead] Error fetching owner WhatsApp:', settingsError);
    }

    const targetWhatsApp = String(ownerWhatsApp || '').replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(targetWhatsApp)) {
      return new Response(JSON.stringify({ error: 'Owner WhatsApp is not configured correctly' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[notify-lead] Target WhatsApp configured.');

    // Format the notification message
    const message = `🔔 *NOVO LEAD CADASTRADO!*

📍 *Loja:* ${cleanStoreName}
📧 *E-mail:* ${cleanEmail}
📱 *Telefone:* ${cleanPhone || 'Não informado'}
🏪 *Segmento:* ${cleanSegment}

---
_Notificação automática do DeliveryPro_`;

    // Create WhatsApp link (for logging/reference)
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${targetWhatsApp}?text=${encodedMessage}`;

    console.log('[notify-lead] Lead notification prepared:', {
      storeName: cleanStoreName,
      email: cleanEmail,
      whatsappUrl: whatsappUrl.substring(0, 100) + '...'
    });

    // Log the lead for analytics/tracking
    console.log('[notify-lead] SUCCESS - Lead ready for notification:', {
      storeName: cleanStoreName,
      email: cleanEmail,
      phone: cleanPhone || 'N/A',
      segment: cleanSegment,
      timestamp: new Date().toISOString()
    });

    // Return the WhatsApp URL for the frontend to open
    return new Response(
      JSON.stringify({ 
        success: true, 
        whatsappUrl,
        message: 'Lead notification prepared successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[notify-lead] Error processing request:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
