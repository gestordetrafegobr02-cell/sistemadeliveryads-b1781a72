// Edge function: creates a Mercado Pago Checkout Pro preference for an order
// that DOES NOT yet exist in the orders table. The full order payload is
// stashed in `pending_orders` and only promoted to a real order once the
// webhook receives an "approved" payment status. This prevents phantom orders
// and merchant notifications before the customer actually pays.
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
  // Pending-order payload (used by the webhook to create the real order on approval)
  customer?: {
    name: string;
    phone: string;
    address?: string | null;
    orderItems: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
      modifiers?: Array<{ id: string; name: string; price: number }>;
      observation?: string | null;
    }>;
    total: number;
    cartId?: string | null;
  };
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

    // Stash the full order payload so the webhook can create the real order on approval.
    if (body.customer) {
      const { error: pendingErr } = await admin
        .from('pending_orders')
        .upsert({
          id: body.orderId,
          store_id: body.storeId,
          payload: body.customer as unknown as Record<string, unknown>,
          status: 'awaiting_payment',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (pendingErr) {
        console.error('[MP] pending_orders upsert error', pendingErr);
        return new Response(JSON.stringify({ error: 'pending_order_failed', detail: pendingErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const preferencePayload = {
      external_reference: body.orderId,
      statement_descriptor: ((store as { name?: string }).name || 'Cardapio').slice(0, 22),
      items: body.items.map((i) => ({
        id: 'item',
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
      binary_mode: false,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook?store_id=${body.storeId}`,
      // Explicitly allow Pix + cards, exclude Boleto/lottery (ticket) and ATM transfers.
      // Pix is included by default (not excluded) and prioritized via default_payment_method_id.
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }],
        excluded_payment_methods: [],
        default_payment_method_id: 'pix',
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
