import { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';
import { CartSheet } from '@/components/CartSheet';
import { CategoriesBar } from '@/components/CategoriesBar';
import { StoreClosedBanner } from '@/components/StoreClosedBanner';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { StoreStatusBadge } from '@/components/StoreStatusBadge';
import { TrialExpiredBanner } from '@/components/TrialExpiredBanner';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { CartProvider } from '@/lib/cart';
import { StoreThemeProvider } from '@/lib/storeTheme';
import { Skeleton } from '@/components/ui/skeleton';
import { isStoreOpen, getTodayHours, OpeningHours } from '@/lib/storeHours';

// Demo store slugs
const DEMO_SLUGS = ['demo-hamburgueria', 'demo-pizzaria', 'demo-acaiteria', 'demo-hortifruti'];

// Public store data from stores_public view (excludes sensitive fields)
interface StorePublic {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  delivery_fee: number | null;
  opening_hours: OpeningHours | null;
  is_open_manual: boolean;
  is_active?: boolean;
  is_trial_expired?: boolean;
  primary_color?: string | null;
  store_template_style?: string | null;
  bg_color?: string | null;
  card_style?: string | null;
}

// Payment data from secure RPC (fetched during checkout flow)
interface PaymentData {
  pix_key: string | null;
  whatsapp: string | null;
  store_name: string | null;
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
  is_featured: boolean;
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

// Validate Facebook Pixel ID format (15-20 digits only)
function isValidPixelId(pixelId: string): boolean {
  return /^[0-9]{15,20}$/.test(pixelId);
}

function loadFacebookPixel(pixelId: string) {
  if (window.fbq) return;
  
  // Validate pixel ID to prevent XSS attacks
  if (!isValidPixelId(pixelId)) {
    return;
  }

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
  const location = useLocation();
  const [store, setStore] = useState<StorePublic | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [facebookPixelId, setFacebookPixelId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Clean slug: lowercase, strip query params / hash fragments
  // Fallback to window.location.pathname for mobile browser compatibility
  const cleanSlug = useMemo(() => {
    let raw = (slug ?? '').trim().toLowerCase();
    if (!raw) {
      // Fallback: extract slug from pathname (e.g. /shop/my-store)
      const segments = window.location.pathname.split('/').filter(Boolean);
      const shopIndex = segments.indexOf('shop');
      if (shopIndex >= 0 && segments[shopIndex + 1]) {
        raw = segments[shopIndex + 1].toLowerCase();
      }
    }
    // Strip anything after ? or # in case it leaks into the param
    return raw.split(/[?#]/)[0];
  }, [slug]);

  useEffect(() => {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let cancelled = false;

    async function doFetch() {
      if (cancelled) return;
      
      console.log('[Shop] cleanSlug:', JSON.stringify(cleanSlug), '| raw slug param:', JSON.stringify(slug), '| pathname:', window.location.pathname);

      if (!cleanSlug) {
        setError('URL inválida — slug vazio. Verifique o link.');
        setLoading(false);
        return;
      }

      try {
        // 1) Fetch store via secure RPC function (excludes sensitive data)
        const { data: storeResult, error: storeError } = await supabase
          .rpc('get_public_store_by_slug', { store_slug: cleanSlug.toLowerCase() });

        console.log('[Shop] RPC result:', { storeError, resultCount: storeResult?.length ?? 0 });

        if (cancelled) return;

        if (storeError) {
          console.error('[Shop] Supabase RPC error:', storeError);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(doFetch, Math.min(1000 * retryCount, 3000));
            return;
          }
          setError(`Erro de conexão: ${storeError.message}`);
          setLoading(false);
          return;
        }

        if (!storeResult || storeResult.length === 0) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(doFetch, Math.min(1000 * retryCount, 3000));
            return;
          }
          setError(`Loja "${cleanSlug}" não encontrada. Verifique se o link está correto.`);
          setLoading(false);
          return;
        }

          const storeData = storeResult[0];
          const mappedStore: StorePublic = {
            id: storeData.id,
            name: storeData.name,
            logo_url: sanitizeImageUrl(storeData.logo_url) ?? null,
            cover_url: sanitizeImageUrl(storeData.cover_url) ?? null,
            delivery_fee: storeData.delivery_fee,
            opening_hours: storeData.opening_hours as OpeningHours | null,
            is_open_manual: storeData.is_open_manual ?? true,
            is_trial_expired: storeData.is_trial_expired ?? false,
            primary_color: storeData.primary_color ?? null,
            store_template_style: (storeData as any).store_template_style ?? null,
            bg_color: (storeData as any).bg_color ?? null,
            card_style: (storeData as any).card_style ?? null,
          };
          setStore(mappedStore);

          // 2) Fetch payment data via secure RPC (pix_key + whatsapp)
          const { data: paymentResult } = await supabase
            .rpc('get_store_payment_data', { store_slug: cleanSlug });
          
          if (paymentResult && paymentResult.length > 0) {
            setPaymentData(paymentResult[0]);
          }

          // 3) Fetch Facebook Pixel ID via secure RPC
          const { data: pixelId } = await supabase
            .rpc('get_store_pixel_by_slug', { store_slug: cleanSlug });
          
          if (pixelId) {
            setFacebookPixelId(pixelId);
            loadFacebookPixel(pixelId);
            setTimeout(() => {
              if (window.fbq) window.fbq('track', 'ViewContent');
            }, 100);
          }

          // 4) Fetch categories by store_id
          const { data: catData } = await supabase
            .from('categories')
            .select('*')
            .eq('store_id', mappedStore.id)
            .order('sort_order');

          setCategories(catData ?? []);

          // 5) Fetch products by store_id
          const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', mappedStore.id)
            .eq('is_available', true)
            .order('sort_order');

          const sanitizedProducts: Product[] = (prodData ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            image_url: sanitizeImageUrl(p.image_url) ?? null,
            category_id: p.category_id,
            is_featured: p.is_featured ?? false,
          }));

          setProducts(sanitizedProducts);
      } catch {
        if (cancelled) return;
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(doFetch, 1000 * retryCount);
          return;
        }
        setError('Erro inesperado ao carregar dados');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Start fetching immediately — no artificial delay
    doFetch();

    return () => { cancelled = true; };
  }, [cleanSlug]);

  // Check if store is open
  const storeIsOpen = useMemo(() => {
    if (!store) return true;
    return isStoreOpen(store.opening_hours, store.is_open_manual);
  }, [store]);

  // Check if this is a demo store
  const isDemoStore = useMemo(() => {
    return DEMO_SLUGS.includes(cleanSlug);
  }, [cleanSlug]);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p) => p.category_id === activeCategory);
  }, [products, activeCategory]);

  // Featured products
  const featuredProducts = useMemo(() => {
    return products.filter((p) => p.is_featured);
  }, [products]);

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
        <div className="text-center max-w-md space-y-4">
          <h1 className="font-display text-4xl text-foreground mb-2">Oops!</h1>
          <p className="text-muted-foreground text-lg">{error || 'Loja não encontrada'}</p>
          <p className="text-xs text-muted-foreground/60 font-mono break-all">
            slug: "{cleanSlug}" | path: {window.location.pathname}
          </p>
          <a href="/" className="inline-block mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }

  // ---------------------------
  // RENDER: Store inactive
  // ---------------------------
  if (store.is_active === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-foreground mb-2">Loja Temporariamente Inativa</h1>
          <p className="text-muted-foreground">
            Esta loja está temporariamente indisponível. Por favor, tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------
  // RENDER: Trial expired
  // ---------------------------
  if (store.is_trial_expired) {
    return <TrialExpiredBanner storeName={store.name} />;
  }

  // Grouped products by category (only when no active filter)
  const productsByCategory = categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const uncategorizedProducts = products.filter((p) => !p.category_id);
  const showCategorySections = activeCategory === null;

  const ogTitle = store.name;
  const ogDescription = `Peça agora no ${store.name}`;
  const ogImage = store.logo_url || '/logo.png';

  return (
    <StoreThemeProvider primaryColor={store.primary_color ?? null} templateStyle={store.store_template_style ?? null} bgColor={store.bg_color ?? null} cardStyle={store.card_style ?? null}>
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:type" content="website" />
        <meta name="description" content={ogDescription} />
      </Helmet>
      <CartProvider>
        <div className="min-h-screen bg-background pb-28">
          {/* Demo Mode Banner */}
        {isDemoStore && <DemoModeBanner storeName={store.name} />}
        
        {/* Hero Section with Full-width Cover */}
        <header className="relative">
          {/* Cover Image */}
          <div className="w-full h-40 sm:h-52 bg-gradient-to-br from-primary/30 to-primary/10 overflow-hidden">
            {store.cover_url ? (
              <img
                src={store.cover_url}
                alt={`Capa ${store.name}`}
                className="w-full h-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
            )}
          </div>

          {/* Logo Avatar - overlapping cover */}
          <div className="relative max-w-2xl mx-auto px-4">
            <div className="flex flex-col items-center -mt-12 sm:-mt-14">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-xl bg-card"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-card border-4 border-white shadow-xl flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{store.name.charAt(0)}</span>
                </div>
              )}

              {/* Store Info */}
              <div className="mt-3 text-center space-y-1">
                <h1 className="font-bold text-xl sm:text-2xl text-foreground">{store.name}</h1>
                {store.opening_hours && getTodayHours(store.opening_hours) && (
                  <p className="text-xs text-muted-foreground">
                    Hoje: {getTodayHours(store.opening_hours)}
                  </p>
                )}
                <StoreStatusBadge isOpen={storeIsOpen} />
              </div>
            </div>
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
          {/* Featured Products Section */}
          {showCategorySections && featuredProducts.length > 0 && (
            <FeaturedProducts products={featuredProducts} />
          )}

          {showCategorySections ? (
            <>
              {productsByCategory.map((category) =>
                category.products.length > 0 ? (
                  <section key={category.id}>
                    <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                      <span className="w-2 h-6 bg-primary rounded-full" />
                      {category.name}
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                   <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
            whatsapp={paymentData?.whatsapp || ''}
            deliveryFee={store.delivery_fee || 0}
            pixKey={paymentData?.pix_key || undefined}
            onPurchase={handlePurchase}
            onOpen={handleCartOpen}
            isStoreOpen={storeIsOpen}
          />
        </div>
      </CartProvider>
    </StoreThemeProvider>
  );
}
