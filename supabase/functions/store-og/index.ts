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
  const slug = url.searchParams.get("slug")?.trim().toLowerCase();

  if (!slug) {
    return new Response("Missing slug", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .rpc("get_public_store_by_slug", { store_slug: slug });

  const store = data?.[0];

  const siteDomain = "https://sistemadeliveryads.site";
  const storeUrl = `${siteDomain}/${slug}`;

  const storeName = store?.name || slug;
  const storeDescription = `Faça seu pedido online agora! | ${storeName}`;
  const rawLogo = store?.logo_url || '';
  const storeImage = rawLogo ? (rawLogo.includes('?') ? `${rawLogo}&v=100` : `${rawLogo}?v=100`) : '';
  const themeColor = store?.primary_color || "#f59e0b";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(storeName)}</title>
  <meta name="description" content="${escapeHtml(storeDescription)}" />
  <meta name="theme-color" content="${escapeHtml(themeColor)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(storeName)}" />
  <meta property="og:description" content="${escapeHtml(storeDescription)}" />
  <meta property="og:image" content="${escapeHtml(storeImage)}" />
  <meta property="og:url" content="${escapeHtml(storeUrl)}" />
  <meta property="og:site_name" content="${escapeHtml(storeName)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(storeName)}" />
  <meta name="twitter:description" content="${escapeHtml(storeDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(storeImage)}" />

  <!-- Redirect to actual store -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(storeUrl)}" />
  <link rel="canonical" href="${escapeHtml(storeUrl)}" />
</head>
<body>
  <p>Redirecionando para <a href="${escapeHtml(storeUrl)}">${escapeHtml(storeName)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
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
