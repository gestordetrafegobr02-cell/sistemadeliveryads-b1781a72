/**
 * Configuração global do site.
 * BASE_URL é o domínio oficial usado para gerar links de lojas,
 * e-mails, redirecionamentos, etc.
 */
export const SITE_URL = 'https://sistemadeliveryads.site';

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\s]/g, '');
}

/**
 * Gera o link público de uma loja a partir do slug.
 * Formato: https://sistemadeliveryads.site/{slug}
 */
export function getStoreUrl(slug: string): string {
  const cleanSlug = sanitizePathSegment(slug);
  return `${SITE_URL}/${cleanSlug}`;
}

export function getOrderTrackingUrl(orderId: string, sessionToken?: string | null): string {
  const cleanOrderId = sanitizePathSegment(orderId);
  const query = sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : '';
  return `${SITE_URL}/pedido/${cleanOrderId}${query}`;
}
