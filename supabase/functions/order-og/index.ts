import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId")?.trim();

  if (!orderId) {
    return new Response("Missing orderId", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase.rpc("get_order_by_id", { p_order_id: orderId });
  const order = data?.[0];

  const siteDomain = "https://sistemadeliveryads.site";
  const orderUrl = `${siteDomain}/order-status/${orderId}`;

  const storeName = order?.store_name || "Pedido";
  const ogTitle = `Acompanhe seu pedido - ${storeName}`;
  const ogDescription = `Veja em tempo real o status do seu pedido na ${storeName}`;
  const rawLogo = order?.store_logo_url || `${siteDomain}/logo.png`;
  const ogImage = rawLogo.includes("?") ? `${rawLogo}&v=4` : `${rawLogo}?v=4`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:url" content="${escapeHtml(orderUrl)}" />
  <meta property="og:site_name" content="${escapeHtml(storeName)}" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  <meta http-equiv="refresh" content="0;url=${escapeHtml(orderUrl)}" />
  <link rel="canonical" href="${escapeHtml(orderUrl)}" />
</head>
<body>
  <p>Redirecionando para <a href="${escapeHtml(orderUrl)}">${escapeHtml(ogTitle)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
