// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Você é um extrator de cardápios de delivery brasileiros.
Receba uma imagem (foto de cardápio/flyer) OU um texto solto de menu e retorne SOMENTE JSON válido no formato:
{
  "items": [
    {
      "category": "Categoria (ex: Hambúrgueres, Bebidas, Açaí)",
      "name": "Nome do produto",
      "description": "Descrição curta (pode ser vazia)",
      "price": 25.90
    }
  ]
}

Regras estritas:
- Preços em número decimal (não string), interpretando R$, vírgula ou ponto como decimal.
- Se um item tiver múltiplos tamanhos (300ml, 500ml, 700ml) crie UM produto por tamanho, incluindo o tamanho no nome (ex: "Açaí 500ml").
- Categorize agrupando por seção do cardápio; se não houver seção clara, use "Cardápio".
- NÃO invente produtos. Extraia apenas o que está visível/escrito.
- Ignore endereços, telefones, horários, condições de entrega.
- Nunca retorne markdown, comentários ou texto fora do JSON.`;

const MODEL = 'openai/gpt-5.5';

async function logUsage(payload: {
  store_id?: string | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  success: boolean;
  error_message?: string | null;
}) {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;
    const admin = createClient(url, key);
    await admin.from('ai_usage_logs').insert({
      function_name: 'ai-import-menu',
      model: MODEL,
      store_id: payload.store_id ?? null,
      prompt_tokens: payload.prompt_tokens ?? 0,
      completion_tokens: payload.completion_tokens ?? 0,
      total_tokens: payload.total_tokens ?? 0,
      success: payload.success,
      error_message: payload.error_message ?? null,
    });
  } catch (_) {
    // ignore logging failures
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' },
    });
  }

  let storeId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Configuração de autenticação indisponível');
    }
    if (!apiKey) {
      await logUsage({ success: false, error_message: 'LOVABLE_API_KEY não configurada' });
      return new Response(JSON.stringify({ error: 'Serviço de IA indisponível' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    const maxBodyBytes = 11 * 1024 * 1024;
    if (contentLength > maxBodyBytes) {
      return new Response(JSON.stringify({ error: 'Requisição muito grande (limite de 11MB)' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const rawBody = await req.text();
    if (!rawBody || new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
      return new Response(JSON.stringify({ error: 'Requisição vazia ou acima do limite de 11MB' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { image?: unknown; text?: unknown; store_id?: unknown };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (typeof body.store_id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.store_id)) {
      return new Response(JSON.stringify({ error: 'Loja inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    storeId = body.store_id;

    // Service-role access is used only after the caller's JWT is verified.
    // The store_id in the request is untrusted until ownership/membership is checked.
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const [{ data: store, error: storeError }, { data: membership, error: memberError }] = await Promise.all([
      admin.from('stores').select('owner_id').eq('id', storeId).maybeSingle(),
      admin.from('store_members').select('role').eq('store_id', storeId).eq('user_id', user.id).maybeSingle(),
    ]);
    if (storeError || memberError) {
      throw new Error('Não foi possível validar o acesso à loja');
    }
    const isOwner = store?.owner_id === user.id;
    const canManage = membership?.role === 'owner' || membership?.role === 'manager';
    if (!store || (!isOwner && !canManage)) {
      return new Response(JSON.stringify({ error: 'Você não tem permissão para importar cardápio nesta loja' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const image = typeof body.image === 'string' ? body.image : '';
    const menuText = typeof body.text === 'string' ? body.text.trim() : '';
    if (!image && !menuText) {
      return new Response(JSON.stringify({ error: 'Envie uma imagem ou o texto do cardápio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (menuText.length > 20000) {
      return new Response(JSON.stringify({ error: 'O texto do cardápio deve ter no máximo 20.000 caracteres' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (image && (image.length > 10_800_000 ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))) {
      return new Response(JSON.stringify({ error: 'Imagem inválida ou acima do limite permitido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
    if (menuText) {
      userContent.push({ type: 'text', text: `Extraia os produtos deste cardápio:\n\n${menuText}` });
    }
    if (image) {
      if (!menuText) userContent.push({ type: 'text', text: 'Extraia todos os produtos visíveis nesta foto de cardápio.' });
      userContent.push({ type: 'image_url', image_url: { url: image } });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg = aiRes.status === 429
        ? 'Limite de requisições de IA atingido. Tente novamente em instantes.'
        : aiRes.status === 402
        ? 'Créditos de IA indisponíveis.'
        : `Erro na IA: ${errText.slice(0, 200)}`;
      await logUsage({ store_id: storeId, success: false, error_message: msg });
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseData = await aiRes.json() as {
      usage?: Record<string, unknown>;
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const usage = responseData.usage ?? {};
    const content = responseData.choices?.[0]?.message?.content ?? '{}';
    let parsed: { items?: unknown[] } = { items: [] };
    try {
      const candidate: unknown = typeof content === 'string' ? JSON.parse(content) : content;
      if (candidate && typeof candidate === 'object' && 'items' in candidate) {
        const candidateItems = (candidate as { items?: unknown }).items;
        if (Array.isArray(candidateItems)) parsed = { items: candidateItems };
      }
    } catch {
      parsed = { items: [] };
    }

    const items = Array.isArray(parsed.items) ? parsed.items.slice(0, 100) : [];
    const normalized = items
      .map((item: unknown) => {
        const it = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        const price = Number(it.price);
        return {
          category: String(it.category ?? 'Cardápio').trim().slice(0, 100) || 'Cardápio',
          name: String(it.name ?? '').trim().slice(0, 200),
          description: String(it.description ?? '').trim().slice(0, 500),
          price: Number.isFinite(price) ? Math.max(0, Math.min(price, 1000000)) : 0,
        };
      })
      .filter((item) => item.name.length > 0);

    await logUsage({
      store_id: storeId,
      prompt_tokens: Number(usage.prompt_tokens ?? 0),
      completion_tokens: Number(usage.completion_tokens ?? 0),
      total_tokens: Number(usage.total_tokens ?? 0),
      success: true,
    });

    return new Response(JSON.stringify({ items: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    await logUsage({ store_id: storeId, success: false, error_message: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
