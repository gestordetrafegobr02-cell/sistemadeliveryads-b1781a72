/**
 * Configuração global do site.
 *
 * Para links que serão compartilhados (WhatsApp, rastreamento, etc.) usamos
 * SEMPRE um domínio canônico publicado e válido, porque a origem atual do
 * navegador pode ser:
 *  - um preview iframe inacessível externamente
 *  - um domínio antigo desativado (ex.: sistemadeliveryads.site → 404)
 *
 * Domínios canônicos aceitos (ordem de prioridade quando detectados via
 * window.location): custom domain → lovable.app publicado → fallback.
 */

const CANONICAL_HOSTS = [
  'www.sistemaimctrack.shop',
  'sistemaimctrack.shop',
  'sistemadeliveryads.lovable.app',
];

const FALLBACK_ORIGIN = 'https://sistemadeliveryads.lovable.app';

function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const host = window.location.hostname;
    // Se o usuário já está em um domínio canônico, usa ele.
    if (CANONICAL_HOSTS.includes(host)) {
      return window.location.origin;
    }
    // Aceita previews e qualquer subdomínio lovable.app (cobre múltiplos previews).
    if (host.endsWith('.lovable.app')) {
      return FALLBACK_ORIGIN;
    }
    // Domínio desconhecido (custom domain do cliente, etc.) — usa o origin atual.
    // Evita só o domínio Vercel antigo que está quebrado.
    if (host.endsWith('sistemadeliveryads.site')) {
      return FALLBACK_ORIGIN;
    }
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
}

export const SITE_URL = FALLBACK_ORIGIN;

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\s]/g, '');
}

/**
 * Gera o link público de uma loja a partir do slug, usando o domínio canônico.
 */
export function getStoreUrl(slug: string): string {
  const cleanSlug = sanitizePathSegment(slug);
  return `${getOrigin()}/${cleanSlug}`;
}

export function getOrderTrackingUrl(orderId: string, sessionToken?: string | null): string {
  const cleanOrderId = sanitizePathSegment(orderId);
  const query = sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : '';
  return `${getOrigin()}/pedido/${cleanOrderId}${query}`;
}
