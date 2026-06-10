// Edge function: creates a Mercado Pago Checkout Pro preference for a given order.
// Uses the merchant's own access_token saved in stores.mercadopago_access_token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
}

interface RequestBody {
  storeId: string;
  orderId: string;
  items: PreferenceItem[];
  payerName?: string;
  payerEmail?: string;
  successUrl: string;
  failureUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.storeId || !body.orderId || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: store, error } = await admin
      .from('stores')
      .select('name, slug')
      .eq('id', body.storeId)
      .maybeSingle();

    if (error || !store) {
      return new Response(JSON.stringify({ error: 'store_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: secret } = await admin
      .from('store_secrets')
      .select('mercadopago_access_token')
      .eq('store_id', body.storeId)
      .maybeSingle();
    const token = (secret as { mercadopago_access_token?: string | null } | null)?.mercadopago_access_token;
    if (!token) {
      return new Response(JSON.stringify({ error: 'mercadopago_not_configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const preferencePayload = {
      external_reference: body.orderId,
      statement_descriptor: ((store as { name?: string }).name || 'Cardapio').slice(0, 22),
      items: body.items.map((i) => ({
        title: i.title.slice(0, 250),
        quantity: Math.max(1, Math.floor(i.quantity)),
        currency_id: 'BRL',
        unit_price: Number(i.unit_price.toFixed(2)),
      })),
      payer: body.payerName ? { name: body.payerName, email: body.payerEmail || undefined } : undefined,
      back_urls: {
        success: body.successUrl,
        pending: body.successUrl,
        failure: body.failureUrl,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
        installments: 12,
      },
      metadata: { order_id: body.orderId, store_id: body.storeId },
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });
    const mpJson = await mpRes.json();
    if (!mpRes.ok) {
      console.error('[MP] preference error', mpJson);
      return new Response(JSON.stringify({ error: 'mercadopago_error', detail: mpJson }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        init_point: mpJson.init_point,
        sandbox_init_point: mpJson.sandbox_init_point,
        preference_id: mpJson.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[MP] unexpected', err);
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
