// Edge function: creates a Mercado Pago Checkout Pro PREFERENCE and returns
// the init_point URL. The order is NOT created in `orders` yet — its payload
// is stashed in `pending_orders` and only promoted to a real order once the
// webhook receives an "approved" payment status. Boleto/ticket is blocked;
// only PIX and cards are allowed at MP's hosted checkout.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PreferenceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{ id: string; name: string; price: number }>;
  observation?: string | null;
}

interface RequestBody {
  storeId: string;
  orderId: string;
  amount: number;
  payerName: string;
  payerPhone?: string;
  description?: string;
  successUrl?: string;
  failureUrl?: string;
  customer?: {
    name: string;
    phone: string;
    address?: string | null;
    orderItems: PreferenceItem[];
    total: number;
    cartId?: string | null;
  };
}

function jsonResp(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    console.log('[MP] incoming preference', {
      storeId: body.storeId,
      orderId: body.orderId,
      amount: body.amount,
      payerName: body.payerName,
    });

    if (!body.storeId || !body.orderId || !body.amount || body.amount <= 0) {
      return jsonResp({ error: 'invalid_payload', message: 'Dados do pedido incompletos.' });
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
      return jsonResp({ error: 'store_not_found', message: 'Loja não encontrada.' });
    }

    const { data: secret } = await admin
      .from('store_secrets')
      .select('mercadopago_access_token')
      .eq('store_id', body.storeId)
      .maybeSingle();
    const token = (secret as { mercadopago_access_token?: string | null } | null)?.mercadopago_access_token;
    if (!token) {
      return jsonResp({ error: 'mercadopago_not_configured', message: 'Pagamento online não configurado pela loja.' });
    }

    // Stash full order payload so webhook can create the real order on approval.
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
        return jsonResp({ error: 'pending_order_failed', message: 'Erro ao preparar o pedido. Tente novamente.', detail: pendingErr.message });
      }
    }

    const storeName = ((store as { name?: string }).name || 'Cardapio').slice(0, 22);
    const description = (body.description || `Pedido ${body.orderId.slice(0, 8).toUpperCase()} - ${storeName}`).slice(0, 250);

    // Build a single line item with the grand total. MP requires items[], and a
    // single aggregate line keeps fees/rounding aligned with what the customer
    // sees in the cart (subtotal + delivery, modifiers already folded in).
    const items = [{
      id: body.orderId,
      title: description,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(body.amount.toFixed(2)),
    }];

    const preferencePayload: Record<string, unknown> = {
      items,
      external_reference: body.orderId,
      statement_descriptor: storeName,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook?store_id=${body.storeId}`,
      metadata: { order_id: body.orderId, store_id: body.storeId },
      payer: body.payerName ? { first_name: body.payerName.slice(0, 50) } : undefined,
      payment_methods: {
        // Only PIX and cards. Block boleto explicitly.
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' },
        ],
        installments: 12,
      },
      back_urls: {
        success: body.successUrl || undefined,
        failure: body.failureUrl || body.successUrl || undefined,
        pending: body.successUrl || undefined,
      },
      auto_return: body.successUrl ? 'approved' : undefined,
    };

    console.log('[MP] /v1/preferences payload', preferencePayload);

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': body.orderId,
      },
      body: JSON.stringify(preferencePayload),
    });
    const mpJson = await mpRes.json();
    if (!mpRes.ok) {
      console.error('[MP] preference error', mpRes.status, mpJson);
      return jsonResp({
        error: 'mercadopago_error',
        message: 'Erro ao gerar link de pagamento. Tente novamente.',
        detail: mpJson,
      });
    }

    const initPoint: string | undefined = mpJson?.init_point || mpJson?.sandbox_init_point;
    if (!initPoint) {
      console.error('[MP] missing init_point in response', mpJson);
      return jsonResp({
        error: 'init_point_missing',
        message: 'Erro ao gerar link de pagamento. Tente novamente.',
        detail: mpJson,
      });
    }

    return jsonResp({
      preference_id: mpJson.id,
      init_point: initPoint,
    });
  } catch (err) {
    console.error('[MP] unexpected', err);
    return jsonResp({
      error: 'internal_error',
      message: 'Erro inesperado ao gerar link de pagamento. Tente novamente.',
      detail: String(err),
    });
  }
});
