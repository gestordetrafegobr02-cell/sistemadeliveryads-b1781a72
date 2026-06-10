// Edge function: NATIVE Mercado Pago Transparent Checkout.
// Two flows, both via /v1/payments:
//   - PIX:  returns qr_code + qr_code_base64 to render inside our own modal.
//   - CARD: receives a client-tokenized card token (created in browser via
//           MercadoPago.js) plus installments + payment_method_id and charges it.
//
// We synthesize the payer email/first_name/last_name from the simple
// (Nome + Telefone) form the customer filled out — they never see those fields.
// The full order payload is stashed in `pending_orders`; the webhook (or, for
// instantly-approved cards, this function) promotes it into a real order.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface OrderItem {
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
  paymentType: 'pix' | 'card';
  // Card flow only:
  cardToken?: string;
  installments?: number;
  paymentMethodId?: string; // e.g. "visa", "master"
  issuerId?: string;
  customer?: {
    name: string;
    phone: string;
    address?: string | null;
    orderItems: OrderItem[];
    total: number;
    cartId?: string | null;
  };
}

function jsonResp(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function splitName(full: string): { first: string; last: string } {
  const clean = (full || 'Cliente').trim().replace(/\s+/g, ' ');
  const parts = clean.split(' ');
  if (parts.length === 1) return { first: parts[0].slice(0, 50), last: 'Cliente' };
  return {
    first: parts[0].slice(0, 50),
    last: parts.slice(1).join(' ').slice(0, 50),
  };
}

function fallbackEmail(phone: string, orderId: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const key = digits || orderId.replace(/-/g, '').slice(0, 12);
  return `${key}@cardapioprivado.com`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    console.log('[MP] incoming', {
      storeId: body.storeId,
      orderId: body.orderId,
      amount: body.amount,
      paymentType: body.paymentType,
      payerName: body.payerName,
    });

    if (!body.storeId || !body.orderId || !body.amount || body.amount <= 0) {
      return jsonResp({ error: 'invalid_payload', message: 'Dados do pedido incompletos.' });
    }
    if (body.paymentType !== 'pix' && body.paymentType !== 'card') {
      return jsonResp({ error: 'invalid_payment_type', message: 'Método de pagamento inválido.' });
    }
    if (body.paymentType === 'card' && (!body.cardToken || !body.paymentMethodId)) {
      return jsonResp({ error: 'card_data_missing', message: 'Dados do cartão incompletos.' });
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

    // Stash full order so webhook (or our post-approval branch) can promote it.
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
    const { first, last } = splitName(body.payerName);
    const email = fallbackEmail(body.payerPhone || '', body.orderId);
    const phoneDigits = (body.payerPhone || '').replace(/\D/g, '');
    const areaCode = phoneDigits.slice(0, 2) || '11';
    const phoneNumber = phoneDigits.slice(2) || phoneDigits || '999999999';

    const basePayer = {
      email,
      first_name: first,
      last_name: last,
      phone: { area_code: areaCode, number: phoneNumber },
    };

    const paymentPayload: Record<string, unknown> = body.paymentType === 'pix'
      ? {
          transaction_amount: Number(body.amount.toFixed(2)),
          description,
          payment_method_id: 'pix',
          external_reference: body.orderId,
          notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook?store_id=${body.storeId}`,
          statement_descriptor: storeName,
          metadata: { order_id: body.orderId, store_id: body.storeId },
          payer: basePayer,
        }
      : {
          transaction_amount: Number(body.amount.toFixed(2)),
          description,
          token: body.cardToken,
          installments: body.installments || 1,
          payment_method_id: body.paymentMethodId,
          issuer_id: body.issuerId || undefined,
          external_reference: body.orderId,
          notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook?store_id=${body.storeId}`,
          statement_descriptor: storeName,
          metadata: { order_id: body.orderId, store_id: body.storeId },
          payer: basePayer,
        };

    console.log('[MP] /v1/payments payload', { type: body.paymentType, orderId: body.orderId });

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${body.orderId}-${body.paymentType}`,
      },
      body: JSON.stringify(paymentPayload),
    });
    const mpJson = await mpRes.json();
    if (!mpRes.ok) {
      console.error('[MP] /v1/payments error', mpRes.status, mpJson);
      return jsonResp({
        error: 'mercadopago_error',
        message: mpJson?.message || 'Erro ao processar pagamento. Tente novamente.',
        detail: mpJson,
      });
    }

    const status: string = mpJson?.status || '';
    const statusDetail: string = mpJson?.status_detail || '';

    // PIX: return QR data so the client can render it inside our modal.
    if (body.paymentType === 'pix') {
      const tx = mpJson?.point_of_interaction?.transaction_data || {};
      return jsonResp({
        payment_id: mpJson.id,
        status,
        status_detail: statusDetail,
        qr_code: tx.qr_code || null,
        qr_code_base64: tx.qr_code_base64 || null,
        ticket_url: tx.ticket_url || null,
      });
    }

    // CARD: if already approved, promote the pending order now so the user is
    // routed to tracking immediately (don't wait for the webhook).
    if (status === 'approved' && body.customer) {
      try {
        const { data: existing } = await admin
          .from('orders')
          .select('id, payment_status')
          .eq('id', body.orderId)
          .maybeSingle();
        if (!existing) {
          const c = body.customer;
          const { error: rpcErr } = await admin.rpc('create_public_order', {
            p_order_id: body.orderId,
            p_store_id: body.storeId,
            p_customer_name: c.name,
            p_customer_phone: c.phone || null,
            p_items: c.orderItems as unknown as Record<string, unknown>[],
            p_address: c.address || null,
            p_payment_method: 'mercadopago_card',
            p_client_total: c.total,
            p_cart_id: c.cartId || undefined,
          });
          if (rpcErr) console.error('[MP] post-approval create_public_order err', rpcErr);
          else {
            await admin.from('orders').update({ payment_status: 'Pago' }).eq('id', body.orderId);
            await admin.from('pending_orders').delete().eq('id', body.orderId);
          }
        } else if (existing.payment_status !== 'Pago') {
          await admin.from('orders').update({ payment_status: 'Pago' }).eq('id', body.orderId);
        }
      } catch (e) {
        console.error('[MP] post-approval promotion failed', e);
      }
    }

    return jsonResp({
      payment_id: mpJson.id,
      status,
      status_detail: statusDetail,
    });
  } catch (err) {
    console.error('[MP] unexpected', err);
    return jsonResp({
      error: 'internal_error',
      message: 'Erro inesperado ao processar pagamento. Tente novamente.',
      detail: String(err),
    });
  }
});
