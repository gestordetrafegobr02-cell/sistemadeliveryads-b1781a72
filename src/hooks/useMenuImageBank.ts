import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MENU_ASSET_BANK, MenuAssetCategory } from '@/utils/menuAssets';

const CATEGORY_LABELS: Record<string, string> = {
  burgers: 'Hambúrgueres',
  sides: 'Acompanhamentos',
  drinks: 'Bebidas',
  acai: 'Açaí',
  milkshakes: 'Milk-shakes',
  sorvetes: 'Sorvetes',
  pizza: 'Pizzas',
  desserts: 'Sobremesas',
  outros: 'Outros',
};

interface Row {
  id: string;
  category: string;
  name: string;
  url: string;
  sort_order: number;
}

/**
 * Loads the shared menu image bank from Supabase.
 * Falls back to the local hard-coded bank if the query fails / returns empty.
 */
export function useMenuImageBank() {
  const [categories, setCategories] = useState<MenuAssetCategory[]>(MENU_ASSET_BANK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('menu_image_bank')
        .select('id, category, name, url, sort_order')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (!alive) return;
      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      const grouped = new Map<string, MenuAssetCategory>();
      for (const row of data as Row[]) {
        const key = row.category;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            label: CATEGORY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
            items: [],
          });
        }
        grouped.get(key)!.items.push({ id: row.id, name: row.name, url: row.url });
      }
      setCategories(Array.from(grouped.values()));
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { categories, loading };
}
