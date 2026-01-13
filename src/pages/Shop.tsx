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

// Public store data from stores_public view (excludes sensitive fields)
interface StorePublic {
  id: string;
  name: string;
  logo_url: string | null;
  delivery_fee: number | null;
  opening_hours: OpeningHours | null;
  is_open_manual: boolean;
}

// Sensitive checkout data fetched on-demand
interface CheckoutData {
  whatsapp: string | null;
  pix_key: string | null;
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

// Helper: returns valid URL or undefined (rejects base64 or long blobs)
function sanitizeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return undefined;
  if (url.length > 5000) return undefined;
  return url;
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
  const [store, setStore] = useState<StorePublic | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [facebookPixelId, setFacebookPixelId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const trimmedSlug = (slug ?? '').trim().toLowerCase();
      if (!trimmedSlug) {
        setError('URL inválida');
        setLoading(false);
        return;
      }

      try {
        // 1) Fetch store from public view (excludes sensitive data)
        const { data: storeData, error: storeError } = await supabase
          .from('stores_public')
          .select('*')
          .ilike('slug', trimmedSlug)
          .maybeSingle();

        if (storeError) {
          console.error('[Shop] Store fetch error:', storeError);
          setError('Erro ao carregar a loja');
          setLoading(false);
          return;
        }

        if (!storeData) {
          setError('Loja não encontrada');
          setLoading(false);
          return;
        }

        const mappedStore: StorePublic = {
          id: storeData.id,
          name: storeData.name,
          logo_url: sanitizeImageUrl(storeData.logo_url) ?? null,
          delivery_fee: storeData.delivery_fee,
          opening_hours: storeData.opening_hours as OpeningHours | null,
          is_open_manual: storeData.is_open_manual ?? true,
        };
        setStore(mappedStore);

        // 2) Fetch sensitive checkout data via secure function
        const { data: checkoutResult } = await supabase
          .rpc('get_store_checkout_data', { store_id: storeData.id });
        
        if (checkoutResult && checkoutResult.length > 0) {
          setCheckoutData(checkoutResult[0]);
        }

        // 3) Fetch Facebook Pixel ID via secure function
        const { data: pixelId } = await supabase
          .rpc('get_store_pixel', { store_id: storeData.id });
        
        if (pixelId) {
          setFacebookPixelId(pixelId);
          loadFacebookPixel(pixelId);
          setTimeout(() => {
            if (window.fbq) window.fbq('track', 'ViewContent');
          }, 100);
        }

        // 2) Fetch categories by store_id
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeData.id)
          .order('sort_order');

        if (catError) console.error('[Shop] Categories fetch error:', catError);
        setCategories(catData ?? []);

        // 3) Fetch products by store_id
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeData.id)
          .eq('is_available', true)
          .order('sort_order');

        if (prodError) console.error('[Shop] Products fetch error:', prodError);

        const sanitizedProducts: Product[] = (prodData ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price),
          image_url: sanitizeImageUrl(p.image_url) ?? null,
          category_id: p.category_id,
        }));

        setProducts(sanitizedProducts);
        console.log('[Shop] Loaded', sanitizedProducts.length, 'products for store:', storeData.id);
      } catch (err) {
        console.error('[Shop] Unexpected error:', err);
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
    if (window.fbq && facebookPixelId) {
      window.fbq('track', 'Purchase');
    }
  };

  const handleCartOpen = () => {
    if (window.fbq && facebookPixelId) {
      window.fbq('track', 'InitiateCheckout');
    }
  };

  // ---------------------------
  // RENDER: Loading skeleton
  // ---------------------------
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

  // ---------------------------
  // RENDER: Error / Not found
  // ---------------------------
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

  // Grouped products by category (only when no active filter)
  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const uncategorizedProducts = products.filter((p) => !p.category_id);
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
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <h1 className="font-display text-3xl text-gradient">{store.name}</h1>
          </div>
        </header>

        {/* Sticky Categories Bar - add margin-top to content to avoid overlap */}
        <CategoriesBar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryClick={setActiveCategory}
        />

        {/* Store Closed Banner */}
        {!storeIsOpen && (
          <div className="max-w-2xl mx-auto mt-4 px-4">
            <StoreClosedBanner />
          </div>
        )}

        {/* Product List */}
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {showCategorySections ? (
            <>
              {productsByCategory.map((category) =>
                category.products.length > 0 ? (
                  <section key={category.id}>
                    <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-6 bg-primary rounded-full" />
                      {category.name}
                    </h2>
                    <div className="space-y-4">
                      {category.products.map((product) => (
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
                ) : null
              )}

              {uncategorizedProducts.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                    <span className="w-2 h-6 bg-primary rounded-full" />
                    Geral
                  </h2>
                  <div className="space-y-4">
                    {uncategorizedProducts.map((product) => (
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
              )}
            </>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
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
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                Nenhum produto disponível nesta categoria.
              </p>
            </div>
          )}
        </main>

        <CartSheet
          storeId={store.id}
          whatsapp={checkoutData?.whatsapp || ''}
          deliveryFee={store.delivery_fee || 0}
          pixKey={checkoutData?.pix_key || undefined}
          onPurchase={handlePurchase}
          onOpen={handleCartOpen}
          isStoreOpen={storeIsOpen}
        />
      </div>
    </CartProvider>
  );
}
