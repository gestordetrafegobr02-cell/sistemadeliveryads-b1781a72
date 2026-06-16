/**
 * White-label public URL helpers — canonical production domain.
 */

const PRODUCTION_ORIGIN = 'https://deliverypro.site';

export const SITE_URL = PRODUCTION_ORIGIN;

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\s]/g, '');
}

export function getStoreUrl(slug: string): string {
  const cleanSlug = sanitizePathSegment(slug);
  return `${PRODUCTION_ORIGIN}/${cleanSlug}`;
}

export function getOrderTrackingUrl(orderId: string, sessionToken?: string | null): string {
  const cleanOrderId = sanitizePathSegment(orderId);
  const query = sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : '';
  return `${PRODUCTION_ORIGIN}/pedido/${cleanOrderId}${query}`;
}
