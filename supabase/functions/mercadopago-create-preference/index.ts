import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod';

const OrderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  modifiers: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    price: z.number().nonnegative(),
  })).optional(),
  observation: z.string().nullable().optional(),
});

const CurrencySchema = z.preprocess((value) => Number(value), z.number().finite().positive());
const NonNegativeCurrencySchema = z.preprocess((value) => Number(value), z.number().finite().nonnegative());

const BodySchema = z.object({
  storeId: z.string().uuid(),
  orderId: z.string().uuid(),
  amount: CurrencySchema,
  payerName: z.string().trim().min(2).max(120),
  payerPhone: z.string().trim().min(8).max(30).optional(),
  description: z.string().trim().max(250).optional(),
  paymentType: z.enum(['pix', 'card']),
  cardToken: z.string().trim().min(1).optional(),
  installments: z.number().int().positive().max(24).optional(),
  paymentMethodId: z.string().trim().min(1).optional(),
  issuerId: z.string().trim().optional(),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(30),
    address: z.string().trim().max(500).nullable().optional(),
    orderItems: z.array(OrderItemSchema).min(1),
    total: NonNegativeCurrencySchema,
    cartId: z.string().uuid().nullable().optional(),
  }).optional(),
});

type RequestBody = z.infer<typeof BodySchema>;

function jsonResp(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().replace(/\s+/g, ' ').split(' ');
  return {
    first: (parts[0] || 'Cliente').slice(0, 50),
    last: (parts.slice(1).join(' ') || 'Cliente').slice(0, 50),
  };
}

function fallbackEmail(phone: string | undefined, orderId: string): string {
  const cleanedPhone = (phone || '').replace(/[^0-9]/g, '');
  return `${cleanedPhone || orderId.replace(/-/g, '').slice(0, 12)}@cardapioprivado.com`;
}

function safeJsonParse(raw: string) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { raw_response: raw };
  }
}

function sanitizeAmount(total: number): number {
  return parseFloat(Number(total).toFixed(2));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonResp({
        error: 'invalid_payload',
        message: 'Dados do pedido incompletos.',
        detail: parsed.error.flatten(),
      }, 400);
    }

    const body: RequestBody = parsed.data;
    const normalizedAmount = sanitizeAmount(body.amount);
    const normalizedCustomerTotal = body.customer ? sanitizeAmount(body.customer.total) : null;

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return jsonResp({
        error: 'invalid_amount',
        message: 'Valor do pagamento inválido.',
      }, 400);
    }

    if (body.customer && (!Number.isFinite(normalizedCustomerTotal ?? NaN) || (normalizedCustomerTotal ?? 0) < 0)) {
      return jsonResp({
        error: 'invalid_customer_total',
        message: 'Total do pedido inválido.',
      }, 400);
    }

    console.log('[MP] incoming', {
      storeId: body.storeId,
      orderId: body.orderId,
      amount: normalizedAmount,
      paymentType: body.paymentType,
      payerName: body.payerName,
    });

    if (body.paymentType === 'card' && (!body.cardToken || !body.paymentMethodId)) {
      return jsonResp({
        error: 'card_data_missing',
        message: 'Dados do cartão incompletos.',
      }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return jsonResp({
        error: 'missing_backend_config',
        message: 'Configuração do backend indisponível.',
      }, 500);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const [{ data: store, error: storeError }, { data: secret, error: secretError }] = await Promise.all([
      admin.from('stores').select('name, slug').eq('id', body.storeId).maybeSingle(),
      admin.from('store_secrets').select('mercadopago_access_token').eq('store_id', body.storeId).maybeSingle(),
    ]);

    if (storeError || !store) {
      return jsonResp({ error: 'store_not_found', message: 'Loja não encontrada.' }, 404);
    }

    if (secretError) {
      console.error('[MP] token lookup error', secretError);
      return jsonResp({ error: 'mercadopago_not_configured', message: 'Pagamento online não configurado pela loja.' }, 500);
    }

    const accessToken = (secret as { mercadopago_access_token?: string | null } | null)?.mercadopago_access_token?.trim();
    if (!accessToken) {
      return jsonResp({ error: 'mercadopago_not_configured', message: 'Pagamento online não configurado pela loja.' }, 400);
    }

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
        return jsonResp({
          error: 'pending_order_failed',
          message: 'Erro ao preparar o pedido. Tente novamente.',
          detail: pendingErr.message,
        }, 500);
      }
    }

    const { first, last } = splitName(body.payerName);
    const payerEmail = fallbackEmail(body.payerPhone, body.orderId);
    const phoneDigits = (body.payerPhone || '').replace(/\D/g, '');
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook?store_id=${body.storeId}`;
    const idempotencyKey = crypto.randomUUID();

    const paymentPayload: Record<string, unknown> = body.paymentType === 'pix'
      ? {
          transaction_amount: normalizedAmount,
          description: 'Pedido no Cardapio Digital',
          payment_method_id: 'pix',
          external_reference: body.orderId,
          notification_url: webhookUrl,
          metadata: { order_id: body.orderId, store_id: body.storeId },
          payer: {
            email: payerEmail,
            first_name: first,
            last_name: last,
          },
        }
      : {
          transaction_amount: normalizedAmount,
          description: (body.description || `Pedido ${body.orderId.slice(0, 8).toUpperCase()} - ${store.name || 'Cardapio'}`).slice(0, 250),
          token: body.cardToken,
          installments: body.installments || 1,
          payment_method_id: body.paymentMethodId,
          issuer_id: body.issuerId || undefined,
          external_reference: body.orderId,
          notification_url: webhookUrl,
          metadata: { order_id: body.orderId, store_id: body.storeId },
          payer: {
            email: payerEmail,
            first_name: first,
            last_name: last,
            phone: {
              area_code: phoneDigits.slice(0, 2) || '11',
              number: phoneDigits.slice(2) || phoneDigits || '999999999',
            },
          },
        };

    console.log('[MP] /v1/payments request', {
      orderId: body.orderId,
      paymentType: body.paymentType,
      idempotencyKey,
      payload: paymentPayload,
    });

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const rawGatewayResponse = await mpRes.text();
    const mpJson = safeJsonParse(rawGatewayResponse);

    console.log('[MP] gateway raw response', {
      orderId: body.orderId,
      paymentType: body.paymentType,
      statusCode: mpRes.status,
      body: mpJson,
    });

    if (!mpRes.ok) {
      err = new Error(
        typeof mpJson?.message === 'string' ? mpJson.message : 'Erro ao processar pagamento. Tente novamente.'
      );
      (err as Error & { cause?: unknown }).cause = mpJson;
      throw err;
    }

    const status = typeof mpJson?.status === 'string' ? mpJson.status : '';
    const statusDetail = typeof mpJson?.status_detail === 'string' ? mpJson.status_detail : '';

    if (body.paymentType === 'pix') {
      const transactionData = mpJson?.point_of_interaction?.transaction_data;

      if (!transactionData?.qr_code || !transactionData?.qr_code_base64) {
        console.error('[MP] invalid pix gateway payload', mpJson);
        return jsonResp({
          error: 'invalid_pix_response',
          message: 'Falha ao gerar pagamento real. Tente novamente.',
          detail: mpJson,
        }, 502);
      }

      return jsonResp({
        payment_id: mpJson.id,
        status,
        status_detail: statusDetail,
          transaction_amount: Number(mpJson?.transaction_amount ?? normalizedAmount),
        point_of_interaction: {
          ...mpJson.point_of_interaction,
          transaction_data: {
            qr_code: transactionData.qr_code,
            qr_code_base64: transactionData.qr_code_base64,
            ticket_url: transactionData.ticket_url ?? null,
          },
        },
        gateway_response: mpJson,
      });
    }

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
            p_client_total: normalizedCustomerTotal ?? c.total,
            p_cart_id: c.cartId || undefined,
          });

          if (rpcErr) {
            console.error('[MP] post-approval create_public_order err', rpcErr);
          } else {
            await admin.from('orders').update({ payment_status: 'Pago' }).eq('id', body.orderId);
            await admin.from('pending_orders').delete().eq('id', body.orderId);
          }
        } else if (existing.payment_status !== 'Pago') {
          await admin.from('orders').update({ payment_status: 'Pago' }).eq('id', body.orderId);
        }
      } catch (promotionError) {
        console.error('[MP] post-approval promotion failed', promotionError);
      }
    }

    return jsonResp({
      payment_id: mpJson.id,
      status,
      status_detail: statusDetail,
      transaction_amount: Number(mpJson?.transaction_amount ?? normalizedAmount),
      gateway_response: mpJson,
    });
  } catch (error) {
    console.error('[MP] unexpected', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro inesperado ao processar pagamento. Tente novamente.',
      details: error instanceof Error ? (error.cause ?? null) : error,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
