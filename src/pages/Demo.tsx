import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { CategoriesBar } from '@/components/CategoriesBar';
import { ProductCard } from '@/components/ProductCard';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { CartSheet } from '@/components/CartSheet';
import { CartProvider } from '@/lib/cart';
import { StoreThemeProvider } from '@/lib/storeTheme';
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

const TEMPLATE_COLORS: Record<string, string> = {
  'burger-shop': '#E74C3C',
  'acai-shop': '#9B59B6',
  'pizza': '#27AE60',
  'grocery': '#2ECC71',
};

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
        .maybeSingle();

      if (fetchError) {
        console.error('Template fetch error:', fetchError);
        setError('Erro ao carregar template');
        setLoading(false);
        return;
      }
      
      if (!data) {
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
  const templateColor = slug ? TEMPLATE_COLORS[slug] || null : null;

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
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Store className="w-16 h-16 mx-auto text-muted-foreground/40" />
          <h1 className="text-xl font-semibold text-foreground">{error}</h1>
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
    <StoreThemeProvider primaryColor={templateColor}>
      <CartProvider>
        <div className="min-h-screen bg-background pb-28">
          <DemoModeBanner storeName={storeName} />

          <header className="bg-background/80 backdrop-blur-md border-b border-border/30 sticky top-0 z-40">
            <div className="max-w-2xl mx-auto px-6 py-5">
              <div className="flex flex-col items-center text-center gap-2">
                <Link 
                  to="/" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground sm:static sm:translate-y-0 sm:self-start"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                
                <h1 className="text-lg font-semibold text-foreground">{storeName}</h1>
                
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Modo Demo
                </span>
              </div>
            </div>
          </header>

          {sortedCategories.length > 0 && (
            <CategoriesBar
              categories={sortedCategories}
              activeCategory={activeCategory}
              onCategoryClick={setActiveCategory}
            />
          )}

          <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
            {!activeCategory && featuredProducts.length > 0 && (
              <FeaturedProducts products={featuredProducts} />
            )}

            {groupedProducts.map(({ category, products }) => (
              <section key={category.id} id={`cat-${category.id}`} className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2 h-5 bg-primary rounded-full" />
                  {category.name}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
              <div className="text-center py-12 text-muted-foreground">
                Nenhum produto disponível
              </div>
            )}
          </main>

          <CartSheet isStoreOpen={false} />
        </div>
      </CartProvider>
    </StoreThemeProvider>
  );
}
