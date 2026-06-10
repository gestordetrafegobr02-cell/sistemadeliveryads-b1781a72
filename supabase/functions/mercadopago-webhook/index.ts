// Edge function: receives Mercado Pago payment webhook notifications and
// marks the matching order as paid (payment_status = 'Pago') when the
// payment is approved. The notification_url is registered with a ?store_id=
// query param so we can pick the correct merchant access token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('store_id');

    // MP may send data via query (?type=payment&data.id=123) or JSON body
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

    // Always 200 OK to MP so it doesn't retry endlessly
    const ok = () => new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
      const { error } = await admin
        .from('orders')
        .update({ payment_status: 'Pago' })
        .eq('id', orderId)
        .eq('store_id', storeId);
      if (error) console.error('[MP-WEBHOOK] update error', error);
      else console.log('[MP-WEBHOOK] order marked paid', orderId);
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)) {
      await admin
        .from('orders')
        .update({ payment_status: status })
        .eq('id', orderId)
        .eq('store_id', storeId);
    }

    return ok();
  } catch (err) {
    console.error('[MP-WEBHOOK] unexpected', err);
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
