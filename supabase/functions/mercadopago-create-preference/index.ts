// Edge function: creates a NATIVE Mercado Pago PIX payment (no Checkout Pro
// redirect). The order is NOT created in `orders` yet — its payload is stashed
// in `pending_orders` and only promoted to a real order once the webhook
// receives an "approved" payment status. Returns the QR code (image + copia e
// cola string) so the frontend can render a native PIX modal.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  storeId: string;
  orderId: string;
  amount: number;
  payerName: string;
  payerEmail?: string;
  payerPhone?: string;
  description?: string;
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

function splitName(full: string): { first: string; last: string } {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'Cliente', last: 'Cardapio' };
  if (parts.length === 1) return { first: parts[0], last: 'Cliente' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function fallbackEmail(phone?: string, orderId?: string) {
  const digits = (phone || '').replace(/\D/g, '');
  const key = digits || (orderId || '').replace(/-/g, '').slice(0, 12) || 'cliente';
  return `cliente.${key}@cardapio.local`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.storeId || !body.orderId || !body.amount || body.amount <= 0) {
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

    const { first, last } = splitName(body.payerName || body.customer?.name || '');
    const email = (body.payerEmail && body.payerEmail.includes('@'))
      ? body.payerEmail
      : fallbackEmail(body.payerPhone || body.customer?.phone, body.orderId);

    const storeName = ((store as { name?: string }).name || 'Cardapio').slice(0, 22);
    const description = (body.description || `Pedido ${body.orderId.slice(0, 8).toUpperCase()} - ${storeName}`).slice(0, 250);

    const paymentPayload: Record<string, unknown> = {
      transaction_amount: Number(body.amount.toFixed(2)),
      payment_method_id: 'pix',
      description,
      external_reference: body.orderId,
      statement_descriptor: storeName,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook?store_id=${body.storeId}`,
      payer: {
        email,
        first_name: first,
        last_name: last,
      },
      metadata: { order_id: body.orderId, store_id: body.storeId },
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': body.orderId,
      },
      body: JSON.stringify(paymentPayload),
    });
    const mpJson = await mpRes.json();
    if (!mpRes.ok) {
      console.error('[MP] payment error', mpJson);
      return new Response(JSON.stringify({ error: 'mercadopago_error', detail: mpJson }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const poi = mpJson?.point_of_interaction?.transaction_data || {};
    const qrCode: string | undefined = poi.qr_code;
    const qrCodeBase64: string | undefined = poi.qr_code_base64;
    const ticketUrl: string | undefined = poi.ticket_url;

    if (!qrCode || !qrCodeBase64) {
      console.error('[MP] missing PIX QR in response', mpJson);
      return new Response(JSON.stringify({ error: 'pix_qr_missing', detail: mpJson }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        payment_id: mpJson.id,
        status: mpJson.status,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: ticketUrl,
        expires_at: mpJson?.date_of_expiration || null,
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
