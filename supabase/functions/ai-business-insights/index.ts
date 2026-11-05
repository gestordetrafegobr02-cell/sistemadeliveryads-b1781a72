// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'gpt-6-luna';
const ACTIONS = ['menu', 'combos', 'sales', 'forecast'] as const;
type Action = typeof ACTIONS[number];

const prompts: Record<Action, string> = {
  menu: 'Analise o cardápio. Sugira melhorias de descrição e organização. Retorne JSON {summary:string, suggestions:[{product_id:string,name:string,current_description:string,suggested_description:string,reason:string}], notes:string[]}. Não invente ingredientes, características, preços ou produtos. Se os dados não sustentarem uma sugestão, não a faça.',
  combos: 'Identifique oportunidades de combos usando frequência conjunta de itens e pedidos. Retorne JSON {summary:string, suggestions:[{name:string,product_ids:string[],product_names:string[],reason:string,evidence:string}], notes:string[]}. Não invente margens, custos, preços promocionais ou aumento de vendas. Só sugira combinações de produtos existentes.',
  sales: 'Atue como consultor de vendas do delivery. Analise pedidos, produtos e horários. Retorne JSON {summary:string, highlights:[{title:string,detail:string,evidence:string}], opportunities:[{title:string,action:string,evidence:string}], notes:string[]}. Diferencie fatos observados de hipóteses e não invente dados.',
  forecast: 'Estime demanda por dia da semana usando o histórico fornecido. Retorne JSON {summary:string, forecast:[{weekday:string,expected_orders:number,range_low:number,range_high:number,basis:string}], notes:string[]}. Só produza estimativas se houver histórico suficiente; informe claramente limitações e não invente estoque ou demanda futura certa.',
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Método não permitido' }, 405);

  let storeId: string | null = null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const providerKey = Deno.env.get('OPENAI_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey || !providerKey) return response({ error: 'Serviço de IA indisponível por configuração. Verifique OPENAI_API_KEY nos Secrets.' }, 503);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return response({ error: 'Não autenticado' }, 401);
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return response({ error: 'Sessão inválida' }, 401);

    const body = await req.json();
    if (typeof body.store_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.store_id)) return response({ error: 'Loja inválida' }, 400);
    if (!ACTIONS.includes(body.action)) return response({ error: 'Ferramenta de IA inválida' }, 400);
    storeId = body.store_id;
    const action = body.action as Action;

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: store, error: storeError }, { data: membership, error: memberError }] = await Promise.all([
      admin.from('stores').select('id, owner_id, name').eq('id', storeId).maybeSingle(),
      admin.from('store_members').select('role').eq('store_id', storeId).eq('user_id', user.id).maybeSingle(),
    ]);
    if (storeError || memberError) throw new Error('Não foi possível validar o acesso à loja');
    const canManage = store?.owner_id === user.id || membership?.role === 'owner' || membership?.role === 'manager';
    if (!store || !canManage) return response({ error: 'Acesso não autorizado para esta loja' }, 403);

    // Limit each store to 20 AI analyses per hour. Failed requests are not counted here.
    const now = new Date();
    const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const [{ count: hourlyCount, error: hourlyError }, { count: monthlyCount, error: monthlyError }, { data: monthlyUsage, error: totalsError }] = await Promise.all([
      admin.from('ai_usage_logs').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('function_name', 'ai-business-insights').eq('success', true).gte('created_at', since),
      admin.from('ai_usage_logs').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('function_name', 'ai-business-insights').eq('success', true).gte('created_at', monthStart),
      admin.from('ai_usage_logs').select('prompt_tokens,completion_tokens,total_tokens').eq('store_id', storeId).eq('function_name', 'ai-business-insights').eq('success', true).gte('created_at', monthStart),
    ]);
    if (hourlyError || monthlyError || totalsError) throw new Error('Não foi possível verificar o consumo da IA');
    const usage = {
      hourly_limit: 20,
      used_last_hour: hourlyCount ?? 0,
      remaining_last_hour: Math.max(0, 20 - (hourlyCount ?? 0)),
      used_this_month: monthlyCount ?? 0,
      prompt_tokens: (monthlyUsage ?? []).reduce((sum: number, row: any) => sum + Number(row.prompt_tokens ?? 0), 0),
      completion_tokens: (monthlyUsage ?? []).reduce((sum: number, row: any) => sum + Number(row.completion_tokens ?? 0), 0),
      total_tokens: (monthlyUsage ?? []).reduce((sum: number, row: any) => sum + Number(row.total_tokens ?? 0), 0),
      period: monthStart.slice(0, 7),
    };
    if ((hourlyCount ?? 0) >= 20) return response({ error: 'Esta loja atingiu o limite temporário de 20 análises por hora. Aguarde um pouco e tente novamente.', usage }, 429);

    const [productsRes, categoriesRes, ordersRes] = await Promise.all([
      admin.from('products').select('id,name,description,price,category_id,is_available').eq('store_id', storeId).limit(120),
      admin.from('categories').select('id,name,sort_order').eq('store_id', storeId).order('sort_order').limit(100),
      admin.from('orders').select('id,items,total,status,created_at').eq('store_id', storeId).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(160),
    ]);
    if (productsRes.error || categoriesRes.error || ordersRes.error) throw new Error('Não foi possível carregar os dados da loja para análise');

    const products = productsRes.data ?? [];
    const categories = categoriesRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const orderItems = orders.map((o: any) => ({
        items: Array.isArray(o.items) ? o.items.map((item: any) => ({
          product_id: item.product_id ?? item.id ?? products.find((p: any) => typeof item.name === 'string' && p.name?.trim().toLowerCase() === item.name.trim().toLowerCase())?.id ?? null,
          name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Item',
          quantity: Math.max(0, Math.min(99, Number(item.quantity ?? 1) || 1)),
        })) : [],
        total: Number(o.total ?? 0),
        created_at: o.created_at,
      }));
    const pairCounts = new Map<string, { product_ids: string[]; product_names: string[]; orders: number }>();
    for (const order of orderItems) {
      const unique = [...new Map(order.items.filter((item: any) => item.product_id).map((item: any) => [item.product_id, item])).values()];
      for (let i = 0; i < unique.length; i++) for (let j = i + 1; j < unique.length; j++) {
        const pair = [unique[i], unique[j]].sort((a: any, b: any) => String(a.product_id).localeCompare(String(b.product_id)));
        const key = pair.map((item: any) => item.product_id).join(':');
        const existing = pairCounts.get(key) ?? { product_ids: pair.map((item: any) => item.product_id), product_names: pair.map((item: any) => item.name), orders: 0 };
        existing.orders += 1;
        pairCounts.set(key, existing);
      }
    }
    const coOccurrences = [...pairCounts.values()].sort((a, b) => b.orders - a.orders).slice(0, 30);
    const context = {
      store: { name: store.name },
      sample: { products: products.length, categories: categories.length, orders: orders.length },
      products: products.slice(0, 100),
      categories,
      orders: orderItems.slice(0, 50),
      co_occurrences: coOccurrences,
    };

    if (action === 'forecast' && orders.length < 14) {
      return response({ result: { summary: 'Ainda não há histórico suficiente para uma previsão minimamente útil.', forecast: [], notes: ['São necessários pelo menos 14 pedidos registrados; idealmente, várias semanas de histórico.'] }, sample: context.sample, model: MODEL, usage, analysis: { products: products.map((p: any) => ({ id: p.id, name: p.name, category_id: p.category_id, price: p.price })), categories: categories.map((category: any) => category.name), order_count: orders.length, date_from: orders.at(-1)?.created_at ?? null, date_to: orders[0]?.created_at ?? null, co_occurrences: coOccurrences.slice(0, 10) } });
    }

    const compactContext = action === 'combos' ? { store: context.store, sample: context.sample, products: products.slice(0, 150).map((p: any) => ({ id: p.id, name: p.name, price: p.price, category_id: p.category_id })), co_occurrences: coOccurrences.slice(0, 15) } : { ...context, orders: orderItems.slice(0, 80) };
    const providerRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${providerKey}` },
      body: JSON.stringify({
        model: MODEL,
        reasoning: { effort: 'none' },
        input: [
          { role: 'system', content: [{ type: 'input_text', text: prompts[action] + String.fromCharCode(10) + 'Retorne somente um objeto JSON válido, sem markdown. Não inclua dados pessoais de clientes. Se faltarem dados, explique nas notas e não invente.' }] },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(compactContext) }] },
        ],
        text: { format: { type: 'json_object' }, verbosity: 'low' },
        max_output_tokens: 2048,
      }),
    };

    // Keep the provider call below the Edge Function execution window.
    // No automatic retries: this avoids multiplying API cost on quota or overload errors.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let aiRes: Response;
    try {
      aiRes = await fetch('https://api.openai.com/v1/responses', { ...providerRequest, signal: controller.signal });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      const message = timedOut
        ? 'A análise excedeu o tempo limite da OpenAI. Tente novamente em instantes.'
        : 'Não foi possível conectar à OpenAI. Tente novamente.';
      await admin.from('ai_usage_logs').insert({ function_name: 'ai-business-insights', model: MODEL, store_id: storeId, success: false, error_message: message });
      return response({ error: message, code: timedOut ? 'AI_TIMEOUT' : 'AI_CONNECTION_ERROR' }, timedOut ? 504 : 503);
    } finally {
      clearTimeout(timeout);
    }

    if (!aiRes.ok) {
      const status = aiRes.status;
      const details = await aiRes.text();
      const message = status === 401 || status === 403
        ? 'A chave da OpenAI não foi aceita. Confira OPENAI_API_KEY e as permissões do projeto.'
        : status === 429
        ? 'A OpenAI atingiu o limite de uso ou de requisições da conta. Verifique os limites e a cobrança da API.'
        : [500, 502, 503, 504].includes(status)
        ? 'A OpenAI está temporariamente indisponível. Seus dados continuam seguros; tente novamente em instantes.'
        : 'Não foi possível concluir a análise na OpenAI. Tente novamente.';
      console.error('OpenAI request failed', status, details.slice(0, 300));
      await admin.from('ai_usage_logs').insert({ function_name: 'ai-business-insights', model: MODEL, store_id: storeId, success: false, error_message: `HTTP ${status}: ${message}` });
      return response({ error: message, code: status === 429 ? 'AI_PROVIDER_QUOTA' : 'AI_PROVIDER_ERROR' }, status === 429 ? 429 : [500, 502, 503, 504].includes(status) ? 503 : status === 401 || status === 403 ? 502 : 502);
    }
    const data = await aiRes.json();
    const raw = typeof data?.output_text === 'string'
      ? data.output_text
      : (data?.output ?? []).flatMap((item: any) => item?.content ?? []).filter((part: any) => part?.type === 'output_text').map((part: any) => part.text ?? '').join('') || '{}';
    let result: any;
    try { result = JSON.parse(raw); } catch { return response({ error: 'A IA retornou uma resposta inválida. Tente novamente.' }, 502); }
    if (action === 'menu' && Array.isArray(result.suggestions)) {
      result.suggestions = result.suggestions.map((s: any) => {
        const product = products.find((p: any) => p.id === s.product_id);
        return product ? { ...s, name: product.name, current_description: product.description ?? '', suggested_description: String(s.suggested_description ?? '').slice(0, 500) } : null;
      }).filter((s: any) => s && s.suggested_description);
    }
    if (action === 'combos' && Array.isArray(result.suggestions)) {
      result.suggestions = result.suggestions.map((s: any) => {
        const ids = Array.isArray(s.product_ids) ? s.product_ids : [];
        const validProducts = ids.map((id: string) => products.find((p: any) => p.id === id)).filter(Boolean);
        return { ...s, product_ids: validProducts.map((p: any) => p.id), product_names: validProducts.map((p: any) => p.name) };
      }).filter((s: any) => s.product_ids.length >= 2);
    }

    await admin.from('ai_usage_logs').insert({
      function_name: 'ai-business-insights',
      model: MODEL,
      store_id: storeId,
      prompt_tokens: Number(data?.usage?.input_tokens ?? 0),
      completion_tokens: Number(data?.usage?.output_tokens ?? 0),
      total_tokens: Number(data?.usage?.total_tokens ?? 0),
      success: true,
    });

    const updatedUsage = { ...usage, used_last_hour: usage.used_last_hour + 1, remaining_last_hour: Math.max(0, usage.remaining_last_hour - 1), used_this_month: usage.used_this_month + 1, prompt_tokens: usage.prompt_tokens + Number(data?.usage?.input_tokens ?? 0), completion_tokens: usage.completion_tokens + Number(data?.usage?.output_tokens ?? 0), total_tokens: usage.total_tokens + Number(data?.usage?.total_tokens ?? 0) };
    return response({ result, sample: context.sample, model: MODEL, usage: updatedUsage, analysis: { products: products.map((p: any) => ({ id: p.id, name: p.name, category_id: p.category_id, price: p.price })), categories: categories.map((category: any) => category.name), order_count: orders.length, date_from: orders.at(-1)?.created_at ?? null, date_to: orders[0]?.created_at ?? null, co_occurrences: coOccurrences.slice(0, 10) } });
  } catch (error) {
    console.error('ai-business-insights:', error);
    return response({ error: error instanceof Error ? error.message : 'Erro inesperado ao analisar a loja' }, 500);
  }
});
