import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { CategoriesBar } from '@/components/CategoriesBar';
import { ProductCard } from '@/components/ProductCard';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Json } from '@/integrations/supabase/types';

interface Category {
  id: string;
  name: string;
  sort_order: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean | null;
  is_featured: boolean | null;
  category_id: string | null;
  sort_order: number | null;
}

interface TemplateData {
  name: string;
  categories: Category[];
  products: Product[];
}

const TEMPLATE_NAMES: Record<string, string> = {
  'burger-shop': 'Hamburgueria Demo',
  'acai-shop': 'Açaiteria Demo',
  'pizza': 'Pizzaria Demo',
  'grocery': 'Hortifruti Demo',
};

export default function Demo() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      if (!slug) return;

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('store_templates')
        .select('name, categories, products')
        .eq('slug', slug)
        .single();

      if (fetchError || !data) {
        setError('Template não encontrado');
        setLoading(false);
        return;
      }

      // Parse JSON data safely
      const parseJsonArray = <T,>(json: Json | null, fallback: T[]): T[] => {
        if (Array.isArray(json)) return json as unknown as T[];
        return fallback;
      };

      setTemplateData({
        name: data.name,
        categories: parseJsonArray<Category>(data.categories, []),
        products: parseJsonArray<Product>(data.products, []),
      });
      setLoading(false);
    }

    loadTemplate();
  }, [slug]);

  const storeName = slug ? TEMPLATE_NAMES[slug] || templateData?.name || 'Demo' : 'Demo';

  const sortedCategories = templateData?.categories
    ? [...templateData.categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  const filteredProducts = templateData?.products
    ? templateData.products.filter(p => 
        p.is_available !== false && 
        (!activeCategory || p.category_id === activeCategory)
      )
    : [];

  const featuredProducts = templateData?.products
    ? templateData.products.filter(p => p.is_featured && p.is_available !== false)
    : [];

  const groupedProducts = sortedCategories.map(cat => ({
    category: cat,
    products: filteredProducts
      .filter(p => p.category_id === cat.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  })).filter(group => group.products.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="bg-primary text-primary-foreground px-4 py-3">
          <Skeleton className="h-5 w-64 mx-auto bg-white/20" />
        </div>
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Store className="w-16 h-16 mx-auto text-neutral-300" />
          <h1 className="text-xl font-semibold text-neutral-700">{error}</h1>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Demo Banner */}
      <DemoModeBanner storeName={storeName} />

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-neutral-500 hover:text-neutral-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">{storeName}</h1>
        </div>
      </header>

      {/* Categories */}
      {sortedCategories.length > 0 && (
        <CategoriesBar
          categories={sortedCategories}
          activeCategory={activeCategory}
          onCategoryClick={setActiveCategory}
        />
      )}

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Featured Products */}
        {!activeCategory && featuredProducts.length > 0 && (
          <FeaturedProducts products={featuredProducts} />
        )}

        {/* Products by Category */}
        {groupedProducts.map(({ category, products }) => (
          <section key={category.id} id={`cat-${category.id}`} className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900">{category.name}</h2>
            <div className="grid grid-cols-1 gap-4">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description || undefined}
                  price={product.price}
                  image_url={product.image_url || undefined}
                />
              ))}
            </div>
          </section>
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            Nenhum produto disponível
          </div>
        )}
      </main>
    </div>
  );
}
