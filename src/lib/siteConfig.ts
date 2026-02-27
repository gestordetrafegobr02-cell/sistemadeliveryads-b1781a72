/**
 * Configuração global do site.
 * BASE_URL é o domínio oficial usado para gerar links de lojas,
 * e-mails, redirecionamentos, etc.
 */
export const SITE_URL = 'https://sistemadeliveryads.site';

/**
 * Gera o link público de uma loja a partir do slug.
 * Formato: https://sistemadeliveryads.site/{slug}
 */
export function getStoreUrl(slug: string): string {
  const cleanSlug = slug
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\s]/g, '');
  return `${SITE_URL}/${cleanSlug}`;
}
