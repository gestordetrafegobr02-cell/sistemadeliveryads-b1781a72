import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

function isTrustedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const trustedHost =
      host === 'fcm.googleapis.com' ||
      host === 'updates.push.services.mozilla.com' ||
      host === 'push.services.mozilla.com' ||
      host === 'web.push.apple.com' ||
      host.endsWith('.notify.windows.com');
    return url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      trustedHost &&
      url.pathname.length > 1;
  } catch {
    return false;
  }
}

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...jsonHeaders, Allow: 'POST, OPTIONS' },
    });
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 16_384) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: jsonHeaders });
    }
    const rawBody = await req.text();
    if (rawBody.length > 16_384) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: jsonHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.slice('Bearer '.length);
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
    }
    const userId = claimsData.claims.sub as string;
    const body = JSON.parse(rawBody);
    const action = body.action || 'subscribe';

    if (action === 'unsubscribe') {
      if (!isTrustedPushEndpoint(body.endpoint)) {
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), { status: 400, headers: jsonHeaders });
      }
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', body.endpoint);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
    }

    if (action !== 'subscribe') {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: jsonHeaders });
    }

    const { store_id, subscription, user_agent } = body;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (
      typeof store_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(store_id) ||
      !isTrustedPushEndpoint(subscription?.endpoint) ||
      typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{80,128}$/.test(p256dh) ||
      typeof auth !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(auth) ||
      (user_agent != null && (typeof user_agent !== 'string' || user_agent.length > 512))
    ) {
      return new Response(JSON.stringify({ error: 'Invalid subscription payload' }), {
        status: 400, headers: jsonHeaders,
      });
    }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      store_id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: user_agent || null,
    }, { onConflict: 'user_id,endpoint' });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err) {
    console.error('push-subscribe error:', err);
    return new Response(JSON.stringify({ error: 'Unable to update push subscription' }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
