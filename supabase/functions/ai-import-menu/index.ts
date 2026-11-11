// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Você é um extrator de cardápios de delivery brasileiros.
Receba uma imagem, um documento PDF (foto, flyer ou arquivo digital de cardápio) OU um texto solto de menu e retorne SOMENTE JSON válido no formato:
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

const MODEL = 'gemini-3.8-flash';
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_FILE_DATA_URL_LENGTH = 11_300_000;
// Keep the upstream request below Supabase's 150s idle-response limit.
const AI_REQUEST_TIMEOUT_MS = 105_000;

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
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Configuração de autenticação indisponível');
    }
    if (!apiKey) {
      await logUsage({ success: false, error_message: 'GEMINI_API_KEY não configurada' });
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
    if (contentLength > MAX_REQUEST_BYTES) {
      return new Response(JSON.stringify({ error: 'Requisição muito grande (limite de 12MB)' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const rawBody = await req.text();
    if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return new Response(JSON.stringify({ error: 'Requisição vazia ou acima do limite de 12MB' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { image?: unknown; images?: unknown; text?: unknown; store_id?: unknown };
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

    const imageInputs = Array.isArray(body.images)
      ? body.images
      : typeof body.image === 'string'
      ? [body.image]
      : [];
    const images = imageInputs.filter((value): value is string => typeof value === 'string');
    const menuText = typeof body.text === 'string' ? body.text.trim() : '';
    if (images.length !== imageInputs.length || images.length > 3) {
      return new Response(JSON.stringify({ error: 'Envie no máximo 3 imagens por importação.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!images.length && !menuText) {
      return new Response(JSON.stringify({ error: 'Envie uma imagem, um PDF ou o texto do cardápio' }), {
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
    const parsedFiles = images.map((image) => ({
      image,
      match: image.match(/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/),
    }));
    const hasPdf = parsedFiles.some((file) => file.match?.[1] === 'application/pdf');
    const invalidFile = parsedFiles.some((file) => !file.match || file.image.length > MAX_FILE_DATA_URL_LENGTH);
    const totalDataUrlLength = parsedFiles.reduce((sum, file) => sum + file.image.length, 0);
    if (invalidFile || (hasPdf && parsedFiles.length > 1) || totalDataUrlLength > (hasPdf ? MAX_FILE_DATA_URL_LENGTH : 10_800_000)) {
      return new Response(JSON.stringify({ error: 'Arquivos inválidos ou acima do limite. Envie até 3 fotos (2,5MB cada; 7,5MB no total) ou um PDF de até 8MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (parsedFiles.some((file) => file.match?.[1] === 'application/pdf' && parsedFiles.length !== 1)) {
      return new Response(JSON.stringify({ error: 'Envie o PDF sozinho, sem combinar com outras imagens.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parts: Array<Record<string, unknown>> = [
      { text: menuText
        ? `Extraia os produtos deste cardápio:\n\n${menuText}`
        : parsedFiles.length > 1
        ? 'As imagens anexadas são páginas do mesmo cardápio. Analise todas em conjunto, mantenha as categorias e não repita produtos que apareçam em mais de uma página. Extraia todos os produtos visíveis em todas as imagens.'
        : 'Extraia todos os produtos visíveis nesta imagem ou documento PDF de cardápio.' },
    ];
    for (const file of parsedFiles) {
      if (!file.match) throw new Error('Arquivo inválido');
      parts.push({ inline_data: { mime_type: file.match[1], data: file.match[2] } });
    }

    const requestBody = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
    let aiRes: Response | null = null;
    let lastProviderError = '';
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      try {
        aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: requestBody,
            signal: controller.signal,
          },
        );
      } catch (error) {
        const message = error instanceof Error && error.name === 'AbortError'
          ? 'A análise do cardápio demorou mais que o esperado. Tente novamente com arquivos menores.'
          : 'Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.';
        await logUsage({ store_id: storeId, success: false, error_message: message });
        return new Response(JSON.stringify({ error: message }), { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } finally {
        clearTimeout(timeout);
      }

      if (aiRes.status !== 503 || attempt === maxAttempts) break;
      lastProviderError = await aiRes.text();
      console.warn(`Gemini returned 503; retrying import (${attempt}/${maxAttempts - 1}).`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }

    if (!aiRes) throw new Error('Não foi possível iniciar a análise com IA.');
    if (!aiRes.ok) {
      const errText = lastProviderError || await aiRes.text();
      const status = aiRes.status === 429 ? 429 : aiRes.status === 503 ? 503 : 500;
      const msg = aiRes.status === 429
        ? 'O serviço de IA atingiu o limite de uso da chave configurada. Aguarde a renovação da cota ou revise os limites da chave.'
        : aiRes.status === 503
        ? 'O Gemini está com alta demanda neste momento. Fizemos novas tentativas automaticamente, mas não foi possível concluir. Aguarde alguns instantes e tente novamente.'
        : aiRes.status === 400 || aiRes.status === 403
        ? 'A configuração ou a permissão da chave do serviço de IA não foi aceita.'
        : 'O serviço de IA encontrou uma falha temporária. Tente novamente em instantes.';
      console.error('AI provider error:', aiRes.status, errText.slice(0, 300));
      await logUsage({ store_id: storeId, success: false, error_message: `Gemini HTTP ${aiRes.status}: ${msg}` });
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseData = await aiRes.json() as {
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const usage = responseData.usageMetadata ?? {};
    const content = responseData.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('') ?? '{}';
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
      prompt_tokens: Number(usage.promptTokenCount ?? 0),
      completion_tokens: Number(usage.candidatesTokenCount ?? 0),
      total_tokens: Number(usage.totalTokenCount ?? 0),
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
