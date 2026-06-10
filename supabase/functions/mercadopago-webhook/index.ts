// Edge function: receives Mercado Pago payment webhook notifications.
// On "approved" status: promotes the matching `pending_orders` row into a real
// order via the `create_public_order` RPC, then marks it as paid. The order
// only becomes visible to the merchant after this point — preventing phantom
// orders and premature WhatsApp/buzzer alerts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface PendingPayload {
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ok = () => new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    let topic = url.searchParams.get('type') || url.searchParams.get('topic') || '';
    let paymentId = url.searchParams.get('data.id') || url.searchParams.get('id') || '';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        topic = topic || body?.type || body?.topic || '';
        paymentId = paymentId || body?.data?.id?.toString() || body?.resource?.toString() || '';
      } catch (_) { /* ignore non-json bodies */ }
    }

    console.log('[MP-WEBHOOK]', { storeId, topic, paymentId });

    if (!storeId || !paymentId || (topic && !topic.includes('payment'))) return ok();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: secret } = await admin
      .from('store_secrets')
      .select('mercadopago_access_token')
      .eq('store_id', storeId)
      .maybeSingle();
    const token = (secret as { mercadopago_access_token?: string | null } | null)?.mercadopago_access_token;
    if (!token) {
      console.warn('[MP-WEBHOOK] no token for store', storeId);
      return ok();
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payment = await mpRes.json();
    if (!mpRes.ok) {
      console.error('[MP-WEBHOOK] payment fetch failed', payment);
      return ok();
    }

    const status: string = payment?.status || '';
    const orderId: string | undefined =
      payment?.external_reference || payment?.metadata?.order_id;

    if (!orderId) {
      console.warn('[MP-WEBHOOK] no order id on payment', paymentId);
      return ok();
    }

    if (status === 'approved') {
      // Check if order already exists (idempotency guard for webhook retries)
      const { data: existingOrder } = await admin
        .from('orders')
        .select('id, payment_status')
        .eq('id', orderId)
        .maybeSingle();

      if (existingOrder) {
        if (existingOrder.payment_status !== 'Pago') {
          await admin.from('orders').update({ payment_status: 'Pago' }).eq('id', orderId);
        }
        console.log('[MP-WEBHOOK] order already exists, marked paid', orderId);
        return ok();
      }

      // Promote pending_orders row into a real order
      const { data: pending, error: pendingErr } = await admin
        .from('pending_orders')
        .select('payload')
        .eq('id', orderId)
        .eq('store_id', storeId)
        .maybeSingle();

      if (pendingErr || !pending) {
        console.warn('[MP-WEBHOOK] no pending_orders row for', orderId, pendingErr);
        return ok();
      }

      const p = pending.payload as unknown as PendingPayload;

      const { error: rpcErr } = await admin.rpc('create_public_order', {
        p_order_id: orderId,
        p_store_id: storeId,
        p_customer_name: p.name,
        p_customer_phone: p.phone || null,
        p_items: p.orderItems as unknown as Record<string, unknown>[],
        p_address: p.address || null,
        p_payment_method: 'mercadopago',
        p_client_total: p.total,
        p_cart_id: p.cartId || undefined,
      });

      if (rpcErr) {
        console.error('[MP-WEBHOOK] create_public_order error', rpcErr);
        return ok();
      }

      const { error: updErr } = await admin
        .from('orders')
        .update({ payment_status: 'Pago' })
        .eq('id', orderId);
      if (updErr) console.error('[MP-WEBHOOK] mark paid error', updErr);

      await admin.from('pending_orders').delete().eq('id', orderId);

      console.log('[MP-WEBHOOK] order promoted + paid', orderId);
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)) {
      // Pending row may be cleaned up; if an order somehow exists, update it.
      await admin
        .from('orders')
        .update({ payment_status: status })
        .eq('id', orderId)
        .eq('store_id', storeId);
      // Remove pending order so it doesn't linger
      await admin.from('pending_orders').delete().eq('id', orderId).eq('store_id', storeId);
    }

    return ok();
  } catch (err) {
    console.error('[MP-WEBHOOK] unexpected', err);
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
