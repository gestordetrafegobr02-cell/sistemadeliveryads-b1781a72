// Groups product variants that share a base name but differ in size.
// Detects trailing size tokens like "300ml", "1 L", "1kg", "500 g", "1,5L".
// Only groups when at least 2 products in the same category share the same
// base name — otherwise the product is returned standalone.

export interface RawProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_featured: boolean;
  has_addons?: boolean;
  has_free_addons?: boolean;
  free_addons_limit?: number;
}

export interface ProductVariant {
  id: string;
  sizeLabel: string;
  price: number;
  image_url: string | null;
  description: string | null;
}

export interface GroupedProductEntry {
  kind: 'group';
  key: string;
  baseName: string;
  description: string | null;
  image_url: string | null;
  minPrice: number;
  variants: ProductVariant[];
  is_featured: boolean;
}

export interface SingleProductEntry {
  kind: 'single';
  key: string;
  product: RawProduct;
}

export type ProductEntry = GroupedProductEntry | SingleProductEntry;

// Matches trailing size: 200ml, 300 ml, 1L, 1,5 L, 1kg, 500g, 1 litro, etc.
const SIZE_REGEX =
  /\s+(\d+(?:[.,]\d+)?)\s*(ml|l|litro|litros|kg|g|gr|gramas)\.?\s*$/i;

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeBaseName(name: string): { base: string; size: string | null } {
  const trimmed = name.trim();
  const match = trimmed.match(SIZE_REGEX);
  if (!match) return { base: trimmed, size: null };
  const base = trimmed.slice(0, match.index).trim().replace(/[-–—:,]$/, '').trim();
  const value = match[1].replace(',', '.');
  const unit = match[2].toLowerCase();
  const displayUnit =
    unit === 'l' || unit === 'litro' || unit === 'litros'
      ? 'L'
      : unit === 'gr' || unit === 'gramas'
        ? 'g'
        : unit;
  // Keep integer display when possible (e.g. "300ml" not "300.0ml")
  const num = Number(value);
  const displayValue = Number.isInteger(num) ? String(num) : value.replace('.', ',');
  return { base, size: `${displayValue}${displayUnit}` };
}

function groupKey(base: string, categoryId: string | null) {
  return `${categoryId || 'none'}::${stripAccents(base).toLowerCase()}`;
}

/**
 * Groups a list of products by "base name" within the same category.
 * Preserves original ordering: the group appears where its FIRST variant was.
 */
export function groupProductsBySize(products: RawProduct[]): ProductEntry[] {
  type Bucket = {
    firstIndex: number;
    baseName: string;
    categoryId: string | null;
    items: Array<{ product: RawProduct; size: string | null }>;
  };
  const buckets = new Map<string, Bucket>();

  products.forEach((product, index) => {
    const { base, size } = normalizeBaseName(product.name);
    const key = groupKey(base, product.category_id);
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push({ product, size });
    } else {
      buckets.set(key, {
        firstIndex: index,
        baseName: base,
        categoryId: product.category_id,
        items: [{ product, size }],
      });
    }
  });

  const entries: Array<{ order: number; entry: ProductEntry }> = [];
  buckets.forEach((bucket, key) => {
    // Group only when 2+ items AND every item has a detected size.
    const allSized = bucket.items.every((i) => i.size !== null);
    if (bucket.items.length >= 2 && allSized) {
      const variants: ProductVariant[] = bucket.items
        .map((i) => ({
          id: i.product.id,
          sizeLabel: i.size!,
          price: i.product.price,
          image_url: i.product.image_url,
          description: i.product.description,
        }))
        .sort((a, b) => a.price - b.price);
      const minPrice = variants[0].price;
      const cover =
        bucket.items.find((i) => i.product.image_url)?.product.image_url ?? null;
      const description =
        bucket.items.find((i) => i.product.description)?.product.description ?? null;
      const isFeatured = bucket.items.some((i) => i.product.is_featured);
      entries.push({
        order: bucket.firstIndex,
        entry: {
          kind: 'group',
          key: `group:${key}`,
          baseName: bucket.baseName,
          description,
          image_url: cover,
          minPrice,
          variants,
          is_featured: isFeatured,
        },
      });
    } else {
      // Emit each item as its own single entry to preserve order accurately.
      bucket.items.forEach((i, idx) => {
        entries.push({
          order: bucket.firstIndex + idx * 0.001,
          entry: {
            kind: 'single',
            key: `single:${i.product.id}`,
            product: i.product,
          },
        });
      });
    }
  });

  return entries.sort((a, b) => a.order - b.order).map((e) => e.entry);
}
