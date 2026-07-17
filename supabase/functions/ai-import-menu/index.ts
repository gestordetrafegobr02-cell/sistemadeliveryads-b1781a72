// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { image, text } = body as { image?: string; text?: string };

    if (!image && !text) {
      return new Response(JSON.stringify({ error: 'Envie image (base64 data URL) ou text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userContent: any[] = [];
    if (text && text.trim()) {
      userContent.push({ type: 'text', text: `Extraia os produtos deste cardápio:\n\n${text.trim()}` });
    }
    if (image) {
      if (!text) userContent.push({ type: 'text', text: 'Extraia todos os produtos visíveis nesta foto de cardápio.' });
      userContent.push({ type: 'image_url', image_url: { url: image } });
    }

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5.5',
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
        ? 'Limite de requisições atingido. Tente novamente em instantes.'
        : aiRes.status === 402
        ? 'Créditos de IA esgotados. Adicione créditos no workspace.'
        : `Erro na IA: ${errText.slice(0, 200)}`;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: any;
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      parsed = { items: [] };
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    const normalized = items
      .map((it: any) => ({
        category: String(it?.category ?? 'Cardápio').trim().slice(0, 100) || 'Cardápio',
        name: String(it?.name ?? '').trim().slice(0, 200),
        description: String(it?.description ?? '').trim().slice(0, 500),
        price: Number.isFinite(Number(it?.price)) ? Math.max(0, Number(it.price)) : 0,
      }))
      .filter((it: any) => it.name.length > 0);

    return new Response(JSON.stringify({ items: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
