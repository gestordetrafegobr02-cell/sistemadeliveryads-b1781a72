import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';
import { CartSheet } from '@/components/CartSheet';
import { CategoriesBar } from '@/components/CategoriesBar';
import { StoreClosedBanner } from '@/components/StoreClosedBanner';
import { CartProvider } from '@/lib/cart';
import { Skeleton } from '@/components/ui/skeleton';
import { isStoreOpen, OpeningHours } from '@/lib/storeHours';

interface Store {
  id: string;
  name: string;
  whatsapp: string | null;
  facebook_pixel_id: string | null;
  logo_url: string | null;
  delivery_fee: number | null;
  pix_key: string | null;
  opening_hours: OpeningHours | null;
  is_open_manual: boolean;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
}

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}

function loadFacebookPixel(pixelId: string) {
  if (window.fbq) return;

  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

export default function Shop() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!slug) {
        setError('URL inválida');
        setLoading(false);
        return;
      }

      try {
        // Case-insensitive slug lookup
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .ilike('slug', slug)
          .maybeSingle();

        if (storeError) {
          console.error('Store fetch error:', storeError);
          setError('Erro ao carregar a loja');
          setLoading(false);
          return;
        }

        if (!storeData) {
          setError('Loja não encontrada');
          setLoading(false);
          return;
        }

        setStore({
          ...storeData,
          opening_hours: storeData.opening_hours as OpeningHours | null,
          is_open_manual: storeData.is_open_manual ?? true,
        });

        // Load Facebook Pixel
        if (storeData.facebook_pixel_id) {
          loadFacebookPixel(storeData.facebook_pixel_id);
          setTimeout(() => {
            if (window.fbq) {
              window.fbq('track', 'ViewContent');
            }
          }, 100);
        }

        // Fetch categories and products in parallel
        const [catRes, prodRes] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .eq('store_id', storeData.id)
            .order('sort_order'),
          supabase
            .from('products')
            .select('*')
            .eq('store_id', storeData.id)
            .eq('is_available', true)
            .order('sort_order'),
        ]);

        if (catRes.error) {
          console.error('Categories fetch error:', catRes.error);
        }
        if (prodRes.error) {
          console.error('Products fetch error:', prodRes.error);
        }

        setCategories(catRes.data ?? []);
        setProducts(prodRes.data ?? []);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Erro inesperado ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  // Check if store is open
  const storeIsOpen = useMemo(() => {
    if (!store) return true;
    return isStoreOpen(store.opening_hours, store.is_open_manual);
  }, [store]);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p) => p.category_id === activeCategory);
  }, [products, activeCategory]);

  const handlePurchase = () => {
    if (window.fbq && store?.facebook_pixel_id) {
      window.fbq('track', 'Purchase');
    }
  };

  const handleCartOpen = () => {
    if (window.fbq && store?.facebook_pixel_id) {
      window.fbq('track', 'InitiateCheckout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="font-display text-4xl text-foreground mb-2">Oops!</h1>
          <p className="text-muted-foreground">{error || 'Loja não encontrada'}</p>
        </div>
      </div>
    );
  }

  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: filteredProducts.filter((p) => p.category_id === cat.id),
  }));

  const uncategorizedProducts = filteredProducts.filter((p) => !p.category_id);

  // Show all filtered products when a specific category is selected
  const showCategorySections = activeCategory === null;

  return (
    <CartProvider>
      <div className="min-h-screen bg-background pb-28">
        {/* Header */}
        <header className="sticky top-0 z-40 glass-card border-b border-border/50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary"
              />
            )}
            <h1 className="font-display text-3xl text-gradient">{store.name}</h1>
          </div>
        </header>

        {/* Sticky Categories Bar */}
        <CategoriesBar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryClick={setActiveCategory}
        />

        {/* Store Closed Banner */}
        {!storeIsOpen && (
          <div className="max-w-2xl mx-auto mt-4">
            <StoreClosedBanner />
          </div>
        )}

        {/* Menu */}
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {showCategorySections ? (
            <>
              {productsByCategory.map((category) => (
                category.products.length > 0 && (
                  <section key={category.id} className="animate-fade-in">
                    <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-6 bg-primary rounded-full" />
                      {category.name}
                    </h2>
                    <div className="space-y-4">
                      {category.products.map((product, index) => (
                        <div 
                          key={product.id} 
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <ProductCard
                            id={product.id}
                            name={product.name}
                            description={product.description || undefined}
                            price={Number(product.price)}
                            image_url={product.image_url || undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              ))}

              {uncategorizedProducts.length > 0 && (
                <section className="animate-fade-in">
                  <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-primary rounded-full" />
                    Outros
                  </h2>
                  <div className="space-y-4">
                    {uncategorizedProducts.map((product, index) => (
                      <div 
                        key={product.id} 
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ProductCard
                          id={product.id}
                          name={product.name}
                          description={product.description || undefined}
                          price={Number(product.price)}
                          image_url={product.image_url || undefined}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    description={product.description || undefined}
                    price={Number(product.price)}
                    image_url={product.image_url || undefined}
                  />
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <p className="text-muted-foreground text-lg">
                Nenhum produto disponível nesta categoria.
              </p>
            </div>
          )}
        </main>

        <CartSheet 
          storeId={store.id}
          whatsapp={store.whatsapp || ''} 
          deliveryFee={store.delivery_fee || 0}
          pixKey={store.pix_key || undefined}
          onPurchase={handlePurchase}
          onOpen={handleCartOpen}
          isStoreOpen={storeIsOpen}
        />
      </div>
    </CartProvider>
  );
}
