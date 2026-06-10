/**
 * White-label public URL helpers — always honor the current browser host.
 * No legacy domain references anywhere.
 */

const FALLBACK_ORIGIN = 'https://sistemadeliveryads.lovable.app';

function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
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

export function getStoreUrl(slug: string): string {
  const cleanSlug = sanitizePathSegment(slug);
  return `${getOrigin()}/${cleanSlug}`;
}

export function getOrderTrackingUrl(orderId: string, sessionToken?: string | null): string {
  const cleanOrderId = sanitizePathSegment(orderId);
  const query = sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : '';
  return `${getOrigin()}/pedido/${cleanOrderId}${query}`;
}
