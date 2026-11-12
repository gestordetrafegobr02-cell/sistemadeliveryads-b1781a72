import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'] as const;
const AI_MODEL_TIMEOUT_MS = 12_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'POST, OPTIONS' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !apiKey) {
      return new Response(JSON.stringify({ error: 'Serviço de IA indisponível ou não configurado.' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const productId = typeof body.product_id === 'string' ? body.product_id : '';
    const storeId = typeof body.store_id === 'string' ? body.store_id : '';
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuid.test(productId) || !uuid.test(storeId)) {
      return new Response(JSON.stringify({ error: 'Produto ou loja inválidos.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const [{ data: store }, { data: membership }, { data: product, error: productError }] = await Promise.all([
      admin.from('stores').select('owner_id').eq('id', storeId).maybeSingle(),
      admin.from('store_members').select('role').eq('store_id', storeId).eq('user_id', user.id).maybeSingle(),
      admin.from('products').select('id, store_id, name, description').eq('id', productId).eq('store_id', storeId).maybeSingle(),
    ]);
    const canManage = membership?.role === 'owner' || membership?.role === 'manager';
    if (!store || (store.owner_id !== user.id && !canManage)) {
      return new Response(JSON.stringify({ error: 'Você não tem permissão para analisar produtos desta loja.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Produto não encontrado nesta loja.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!product.description?.trim()) {
      return new Response(JSON.stringify({ error: 'Adicione uma descrição ao produto antes de solicitar a análise.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: candidates, error: candidatesError } = await admin
      .from('product_modifiers')
      .select('id, name, is_default')
      .eq('product_id', productId)
      .eq('is_available', true);
    if (candidatesError) throw new Error('Não foi possível carregar os acompanhamentos vinculados.');
    if (!candidates?.length) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Você identifica ingredientes que já fazem parte da composição de um produto de delivery.
Analise somente a descrição abaixo e compare com a lista fechada de acompanhamentos candidatos.
Retorne SOMENTE JSON válido no formato {"suggestions":[{"modifier_id":"ID_EXATO","reason":"motivo curto","confidence":"high"|"medium"}]}.
Regras:
- Sugira apenas candidatos cujo nome corresponda claramente a um ingrediente explicitamente mencionado na descrição.
- Não sugira ingredientes inferidos, possíveis, opcionais ou apenas comuns nesse tipo de produto.
- Se a descrição disser "opcional", "à escolha" ou equivalente para um ingrediente, não o marque como incluso.
- Não invente IDs nem nomes; use apenas IDs da lista.
- Se houver dúvida, omita o candidato.
- Não retorne candidatos que já estejam marcados como inclusos.
Produto: ${product.name}
Descrição: ${product.description}
Candidatos JSON: ${JSON.stringify(candidates.filter((item) => !item.is_default).map((item) => ({ id: item.id, name: item.name })))}
`;

    const requestBody = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    });
    let aiResponse: Response | null = null;
    let lastStatus = 0;
    let lastError = '';
    for (const model of [MODEL, ...FALLBACK_MODELS]) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_MODEL_TIMEOUT_MS);
      try {
        aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: requestBody,
          signal: controller.signal,
        });
      } catch (error) {
        lastError = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network';
        aiResponse = null;
      } finally {
        clearTimeout(timeout);
      }
      if (aiResponse?.ok) break;
      lastStatus = aiResponse?.status || 0;
      if (aiResponse) lastError = (await aiResponse.text()).slice(0, 300);
      console.warn(`AI modifier model ${model} failed with status ${lastStatus || lastError}.`);
      if (aiResponse && [400, 401, 403, 429].includes(lastStatus)) break;
      aiResponse = null;
    }
    if (!aiResponse?.ok) {
      console.error('AI modifier analysis failed after fallback models:', lastStatus, lastError);
      return new Response(JSON.stringify({ error: 'O serviço de IA está temporariamente indisponível. Tente novamente em instantes.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await aiResponse.json();
    const raw = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '{}';
    let parsed: { suggestions?: unknown[] } = {};
    try {
      const value = JSON.parse(raw);
      if (value && typeof value === 'object' && Array.isArray(value.suggestions)) parsed = value;
    } catch {
      parsed = {};
    }

    const candidateMap = new Map(candidates.map((item) => [item.id, item]));
    const suggestions = (parsed.suggestions || []).flatMap((entry: any) => {
      if (!entry || typeof entry.modifier_id !== 'string') return [];
      const candidate = candidateMap.get(entry.modifier_id);
      if (!candidate || candidate.is_default) return [];
      const confidence = entry.confidence === 'high' ? 'high' : 'medium';
      return [{
        modifier_id: candidate.id,
        name: candidate.name,
        reason: String(entry.reason || 'Ingrediente identificado na descrição.').slice(0, 240),
        confidence,
      }];
    });
    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI modifier analysis error:', error);
    return new Response(JSON.stringify({ error: 'Não foi possível concluir a análise. Tente novamente.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
