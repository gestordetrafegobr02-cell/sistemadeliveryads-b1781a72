const LOVABLE_ASSET_ORIGIN = 'https://sistemadeliveryads.lovable.app';

const ASSET_PREFIX = '/__l5e/assets-v1/';

export function resolveCdnAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.length > 5000) return undefined;

  if (trimmed.startsWith(ASSET_PREFIX)) {
    return `${LOVABLE_ASSET_ORIGIN}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith(ASSET_PREFIX)) {
      return `${LOVABLE_ASSET_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Keep regular relative paths like /logo.png untouched.
  }

  return trimmed;
}