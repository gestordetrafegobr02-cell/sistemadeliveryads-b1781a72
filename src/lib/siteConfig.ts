/**
 * Configuração global do site.
 * Usa a origem atual do navegador para que os links funcionem
 * em qualquer domínio onde a aplicação está publicada (Lovable, custom domain, etc.).
 */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://sistemadeliveryads.lovable.app';
}

export const SITE_URL = getOrigin();

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\s]/g, '');
}

/**
 * Gera o link público de uma loja a partir do slug, usando o domínio atual.
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

