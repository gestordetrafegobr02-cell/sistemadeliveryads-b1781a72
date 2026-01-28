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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: LeadNotification = await req.json();
    const { storeName, email, phone, segment } = body;

    console.log('[notify-lead] Received lead notification request:', { storeName, email, segment });

    // Validate required fields
    if (!storeName || !email) {
      console.error('[notify-lead] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'storeName and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the owner WhatsApp number from global settings
    const { data: ownerWhatsApp, error: settingsError } = await supabase.rpc('get_global_setting', {
      setting_key: 'owner_whatsapp'
    });

    if (settingsError) {
      console.error('[notify-lead] Error fetching owner WhatsApp:', settingsError);
    }

    const targetWhatsApp = ownerWhatsApp || '5511999999999';
    console.log('[notify-lead] Target WhatsApp:', targetWhatsApp);

    // Format the notification message
    const message = `🔔 *NOVO LEAD CADASTRADO!*

📍 *Loja:* ${storeName}
📧 *E-mail:* ${email}
📱 *Telefone:* ${phone || 'Não informado'}
🏪 *Segmento:* ${segment || 'Hamburgueria'}

---
_Notificação automática do Sistema Delivery ADS_`;

    // Create WhatsApp link (for logging/reference)
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${targetWhatsApp}?text=${encodedMessage}`;

    console.log('[notify-lead] Lead notification prepared:', {
      targetWhatsApp,
      storeName,
      email,
      whatsappUrl: whatsappUrl.substring(0, 100) + '...'
    });

    // Log the lead for analytics/tracking
    console.log('[notify-lead] SUCCESS - Lead ready for notification:', {
      storeName,
      email,
      phone: phone || 'N/A',
      segment: segment || 'Hamburgueria',
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
