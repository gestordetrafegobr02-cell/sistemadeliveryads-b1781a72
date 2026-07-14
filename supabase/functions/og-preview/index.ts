// Dynamic Open Graph preview for WhatsApp / Facebook / Twitter / Telegram scrapers.
// Route bot traffic for store pages to this function; returns minimal HTML with
// per-store og:title, og:description and og:image so link previews populate instantly.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, user-agent",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SYSTEM_ROUTES = new Set([
  "", "auth", "admin", "super-admin", "onboarding", "demo", "order-status", "pedido", "api",
]);

const BOT_PATTERNS = [
  "whatsapp", "facebookexternalhit", "facebot", "twitterbot", "telegrambot",
  "linkedinbot", "slackbot", "discordbot", "pinterest", "redditbot",
  "skypeuripreview", "applebot", "googlebot", "bingbot", "embedly",
  "vkshare", "w3c_validator", "tumblr", "bitlybot", "nuzzel", "outbrain",
  "quora link preview", "showyoubot", "yahoo", "ia_archiver",
];

const DEFAULT_TITLE = "Cardápio Digital";
const DEFAULT_DESCRIPTION = "Cardápio digital white-label para pedidos online via DeliveryPro";
const DEFAULT_IMAGE = "/logo.png?v=3";

const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isBot = (ua: string): boolean => {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((pattern) => lower.includes(pattern));
};

const buildHtml = (params: {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
}): string => {
  const { title, description, image, url, siteName } = params;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const i = escapeHtml(image);
  const u = escapeHtml(url);
  const s = escapeHtml(siteName);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t}</title>
<meta name="description" content="${d}" />
<link rel="canonical" href="${u}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${s}" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:image" content="${i}" />
<meta property="og:image:secure_url" content="${i}" />
<meta property="og:url" content="${u}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${i}" />
</head>
<body>
<h1>${t}</h1>
<p>${d}</p>
<p><a href="${u}">${u}</a></p>
</body>
</html>`;
};

const resolveImage = (raw: string | null | undefined, origin: string): string => {
  if (!raw) return `${origin}${DEFAULT_IMAGE}`;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return raw;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const ua = req.headers.get("user-agent") ?? "";
  // Accept slug via ?slug=... or as the last path segment after /og-preview/
  const slugParam = url.searchParams.get("slug") ?? url.searchParams.get("path") ?? "";
  const pathSlug = url.pathname.replace(/^.*\/og-preview\/?/, "");
  const rawSlug = (slugParam || pathSlug || "").split("/").filter(Boolean)[0] ?? "";
  const slug = decodeURIComponent(rawSlug).toLowerCase().trim();

  const requestedOrigin = url.searchParams.get("origin") || "https://deliverypro.site";
  const origin = requestedOrigin.replace(/\/$/, "");
  const storeUrl = slug ? `${origin}/${slug}` : origin;

  const debug = url.searchParams.get("debug") === "1";
  const bot = debug || isBot(ua);

  // If a real browser hits this endpoint and it isn't a bot, just redirect to the actual page.
  if (!bot) {
    return Response.redirect(storeUrl, 302);
  }

  // Fallback defaults (DeliveryPro white-label)
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let image = `${origin}${DEFAULT_IMAGE}`;
  let siteName = "DeliveryPro";

  if (slug && !SYSTEM_ROUTES.has(slug)) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase.rpc("get_public_store_by_slug", { store_slug: slug });
      if (!error && Array.isArray(data) && data.length > 0) {
        const store = data[0] as {
          name?: string;
          logo_url?: string | null;
          cover_url?: string | null;
        };
        if (store?.name) {
          title = `${store.name} - Cardápio Digital`;
          description = `Faça seu pedido online no ${store.name} via DeliveryPro`;
          image = resolveImage(store.cover_url ?? store.logo_url ?? null, origin);
          siteName = store.name;
        }
      }
    } catch (err) {
      console.error("og-preview store lookup failed", err);
    }
  }

  const html = buildHtml({ title, description, image, url: storeUrl, siteName });

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      // Allow scrapers to cache, but keep it short so updates propagate.
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
});
