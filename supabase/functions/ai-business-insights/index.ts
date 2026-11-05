// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'gemini-3.8-flash';
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
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey || !geminiKey) return response({ error: 'Serviço de IA indisponível por configuração' }, 503);

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
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: usageError } = await admin.from('ai_usage_logs').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('function_name', 'ai-business-insights').gte('created_at', since);
    if (usageError) throw new Error('Não foi possível verificar o limite de uso da IA');
    if ((count ?? 0) >= 20) return response({ error: 'Limite de 20 análises por hora atingido nesta loja. Tente novamente mais tarde.' }, 429);

    const [productsRes, categoriesRes, ordersRes] = await Promise.all([
      admin.from('products').select('id,name,description,price,category_id,is_available').eq('store_id', storeId).limit(250),
      admin.from('categories').select('id,name,sort_order').eq('store_id', storeId).order('sort_order').limit(100),
      admin.from('orders').select('id,items,total,status,created_at').eq('store_id', storeId).neq('status', 'cancelled').order('created_at', { ascending: false }).limit(500),
    ]);
    if (productsRes.error || categoriesRes.error || ordersRes.error) throw new Error('Não foi possível carregar os dados da loja para análise');

    const products = productsRes.data ?? [];
    const categories = categoriesRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const context = {
      store: { name: store.name },
      sample: { products: products.length, categories: categories.length, orders: orders.length },
      products,
      categories,
      orders: orders.map((o: any) => ({\n        items: Array.isArray(o.items) ? o.items.map((item: any) => ({\n          product_id: item.product_id ?? item.id ?? null,\n          name: typeof item.name === 'string' ? item.name.slice(0, 120) : 'Item',\n          quantity: Math.max(0, Math.min(99, Number(item.quantity ?? 1) || 1)),\n        })) : [],\n        total: Number(o.total ?? 0),\n        created_at: o.created_at,\n      })),
    };

    if (action === 'forecast' && orders.length < 14) {
      return response({ result: { summary: 'Ainda não há histórico suficiente para uma previsão minimamente útil.', forecast: [], notes: ['São necessários pelo menos 14 pedidos registrados; idealmente, várias semanas de histórico.'] }, sample: context.sample });
    }

    const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: prompts[action] + '\nRetorne somente JSON válido, sem markdown. Não inclua dados pessoais de clientes.' }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(context) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
    if (!aiRes.ok) {
      const details = await aiRes.text();
      console.error('Gemini insights error', aiRes.status, details.slice(0, 300));
      return response({ error: aiRes.status === 429 ? 'Limite do Gemini atingido. Aguarde e tente novamente.' : 'O Gemini está temporariamente indisponível.' }, aiRes.status === 429 ? 429 : 502);
    }
    const data = await aiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '{}';
    let result: any;
    try { result = JSON.parse(raw); } catch { return response({ error: 'A IA retornou uma resposta inválida. Tente novamente.' }, 502); }

    await admin.from('ai_usage_logs').insert({
      function_name: 'ai-business-insights',
      model: MODEL,
      store_id: storeId,
      prompt_tokens: Number(data?.usageMetadata?.promptTokenCount ?? 0),
      completion_tokens: Number(data?.usageMetadata?.candidatesTokenCount ?? 0),
      total_tokens: Number(data?.usageMetadata?.totalTokenCount ?? 0),
      success: true,
    });

    return response({ result, sample: context.sample, model: MODEL });
  } catch (error) {
    console.error('ai-business-insights:', error);
    return response({ error: error instanceof Error ? error.message : 'Erro inesperado ao analisar a loja' }, 500);
  }
});
