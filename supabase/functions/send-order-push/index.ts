import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ---------- Web Push (VAPID + aes128gcm) implementation ----------
const b64urlToBuf = (s: string): Uint8Array => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const bufToB64url = (buf: ArrayBuffer | Uint8Array): string => {
  const b = new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
  let s = '';
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const concat = (...arrs: Uint8Array[]): Uint8Array => {
  const len = arrs.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};

async function importVapidPrivate(jwk: JsonWebKey) {
  return await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}
async function makeVapidJWT(audience: string, subject: string, privJwk: JsonWebKey, publicKeyB64: string) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject };
  const enc = new TextEncoder();
  const h = bufToB64url(enc.encode(JSON.stringify(header)));
  const p = bufToB64url(enc.encode(JSON.stringify(payload)));
  const unsigned = `${h}.${p}`;
  const key = await importVapidPrivate(privJwk);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  return `${unsigned}.${bufToB64url(sig)}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, concat(info, new Uint8Array([1]))));
  return t.slice(0, length);
}

async function encryptPayload(payload: string, p256dhB64: string, authB64: string) {
  const userPubRaw = b64urlToBuf(p256dhB64);
  const userAuth = b64urlToBuf(authB64);
  const userPubKey = await crypto.subtle.importKey('raw', userPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, true, []);

  const localKp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKp.publicKey));

  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: userPubKey }, localKp.privateKey, 256));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // aes128gcm draft-ietf-webpush-encryption-08
  const enc = new TextEncoder();
  const keyInfo = concat(enc.encode('WebPush: info\0'), userPubRaw, localPubRaw);
  const ikm = await hkdf(userAuth, shared, keyInfo, 32);

  const cekInfo = enc.encode('Content-Encoding: aes128gcm\0');
  const cek = await hkdf(salt, ikm, cekInfo, 16);

  const nonceInfo = enc.encode('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const payloadBuf = enc.encode(payload);
  // Padding delimiter = 0x02 for last record
  const padded = concat(payloadBuf, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  // Header: salt(16) | rs(4 = 4096) | idlen(1) | keyid(idlen = local pub raw 65 bytes)
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  const header = concat(salt, rs, new Uint8Array([localPubRaw.length]), localPubRaw);
  return concat(header, ciphertext);
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: string, vapidPubB64: string, privJwk: JsonWebKey, subject: string) {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await makeVapidJWT(audience, subject, privJwk, vapidPubB64);
  const body = await encryptPayload(payload, sub.p256dh, sub.auth);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '60',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'Authorization': `vapid t=${jwt}, k=${vapidPubB64}`,
      'Urgency': 'high',
    },
    body,
  });
  return res;
}
// ---------- end web push ----------

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const left = enc.encode(a);
  const right = enc.encode(b);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const suppliedSecret = req.headers.get('x-internal-secret') ?? '';
    const { data: secretRow, error: secretError } = await admin
      .from('internal_function_secrets')
      .select('secret')
      .eq('key', 'send-order-push')
      .maybeSingle();

    if (secretError) throw new Error('Could not validate internal request');
    const expectedSecret = secretRow?.secret ?? '';
    if (!expectedSecret || !constantTimeEqual(suppliedSecret, expectedSecret)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { order_id, store_id, customer_name, total } = body;
    if (!order_id || !store_id) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify order exists (prevents abuse)
    const { data: order } = await admin.from('orders').select('id, store_id, customer_name, total').eq('id', order_id).maybeSingle();
    if (!order || order.store_id !== store_id) {
      return new Response(JSON.stringify({ error: 'order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: store } = await admin.from('stores').select('name').eq('id', store_id).maybeSingle();
    const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('store_id', store_id);

    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidJwk = JSON.parse(Deno.env.get('VAPID_PRIVATE_JWK')!) as JsonWebKey;
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@deliverypro.site';

    const totalFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.total || total || 0));
    const payload = JSON.stringify({
      title: `🔔 Novo pedido! ${totalFmt}`,
      body: `${order.customer_name || customer_name || 'Cliente'} — ${store?.name || 'sua loja'}`,
      tag: `order-${order_id}`,
      url: '/admin',
    });

    const results = await Promise.allSettled((subs || []).map(async (s) => {
      const res = await sendPush(s, payload, vapidPub, vapidJwk, subject);
      if (res.status === 404 || res.status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id);
      }
      return { id: s.id, status: res.status };
    }));

    return new Response(JSON.stringify({ ok: true, sent: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-order-push error:', err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
