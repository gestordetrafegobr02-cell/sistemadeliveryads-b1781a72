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
const SYSTEM_ROUTES = ['admin', 'auth', 'onboarding', 'super-admin', 'demo', 'order-status', 'pedido', 'shop', 'loja'];

// Public store data from stores_public view (excludes sensitive fields)
interface StorePublic {
  id: string;
  name: string;
  description?: string | null;
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
  const params = useParams<{ slug?: string; storeSlug?: string }>();
  const location = useLocation();
  const slug = params.slug ?? params.storeSlug ?? '';
  const [store, setStore] = useState<StorePublic | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [facebookPixelId, setFacebookPixelId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsWithModifiers, setProductsWithModifiers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Clean slug: lowercase, strip query params / hash / invisible chars
  // Fallback to window.location.pathname for mobile browser compatibility
  const cleanSlug = useMemo(() => {
    let raw = (slug ?? '').trim().toLowerCase();
    if (!raw) {
      // Fallback: extract slug from pathname (e.g. /my-store)
      const segments = location.pathname.split('/').filter(Boolean);
      if ((segments[0] === 'shop' || segments[0] === 'loja') && segments[1]) {
        raw = segments[1].toLowerCase();
      } else if (segments.length >= 1 && !SYSTEM_ROUTES.includes(segments[0])) {
        raw = segments[0].toLowerCase();
      }
    }
    // Strip query/hash, remove invisible unicode chars (mobile keyboards)
    return raw.split(/[?#]/)[0].replace(/[\u200B-\u200D\uFEFF\s]/g, '');
  }, [location.pathname, slug]);

  useEffect(() => {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let cancelled = false;
    let retryTimeout: number | null = null;

    setLoading(true);
    setError(null);
    setStore(null);
    setPaymentData(null);
    setFacebookPixelId(null);
    setCategories([]);
    setProducts([]);
    setActiveCategory(null);

    async function doFetch() {
      if (cancelled) return;
      let retryScheduled = false;
      const normalizedSlug = cleanSlug.toLowerCase();
      
      console.info('[Shop] Starting public store fetch', {
        rawSlugParam: slug,
        normalizedSlug,
        pathname: location.pathname,
      });

      if (!normalizedSlug) {
        console.error('[Shop] Missing store slug for public menu route', {
          rawSlugParam: slug,
          pathname: location.pathname,
        });
        setError('URL inválida — slug vazio. Verifique o link.');
        setStore(null);
        setLoading(false);
        return;
      }

      try {
        // 1) Fetch store via secure RPC function (excludes sensitive data)
        const { data: storeResult, error: storeError } = await supabase
          .rpc('get_public_store_by_slug', { store_slug: normalizedSlug });

        console.info('[Shop] Public store RPC response', {
          normalizedSlug,
          resultCount: storeResult?.length ?? 0,
          hasError: Boolean(storeError),
        });

        if (cancelled) return;

        if (storeError) {
          console.error('[Shop] Public store RPC failed', {
            normalizedSlug,
            pathname: location.pathname,
            error: storeError,
          });
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            retryScheduled = true;
            retryTimeout = window.setTimeout(doFetch, Math.min(1000 * retryCount, 3000));
            return;
          }
          setError(`Erro de conexão: ${storeError.message}`);
          setStore(null);
          setLoading(false);
          return;
        }

        if (!storeResult || storeResult.length === 0) {
          console.warn('[Shop] Public store lookup returned no rows', {
            normalizedSlug,
            pathname: location.pathname,
          });
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            retryScheduled = true;
            retryTimeout = window.setTimeout(doFetch, Math.min(1000 * retryCount, 3000));
            return;
          }
          setError(`Loja "${normalizedSlug}" não encontrada. Verifique se o link está correto.`);
          setStore(null);
          setLoading(false);
          return;
        }

        const storeData = storeResult[0];
        const mappedStore: StorePublic = {
          id: storeData.id,
          name: storeData.name,
          description: typeof (storeData as { description?: unknown }).description === 'string'
            ? (storeData as { description?: string }).description ?? null
            : null,
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
        setError(null);

        const [paymentResponse, pixelResponse, categoriesResponse, productsResponse] = await Promise.all([
          supabase.rpc('get_store_payment_data', { store_slug: normalizedSlug }),
          supabase.rpc('get_store_pixel_by_slug', { store_slug: normalizedSlug }),
          supabase.from('categories').select('*').eq('store_id', mappedStore.id).order('sort_order'),
          supabase.from('products').select('*').eq('store_id', mappedStore.id).eq('is_available', true).order('sort_order'),
        ]);

        if (paymentResponse.error) {
          console.error('[Shop] Payment data RPC failed', {
            normalizedSlug,
            error: paymentResponse.error,
          });
        } else if (paymentResponse.data && paymentResponse.data.length > 0) {
          setPaymentData(paymentResponse.data[0]);
        }

        if (pixelResponse.error) {
          console.error('[Shop] Pixel RPC failed', {
            normalizedSlug,
            error: pixelResponse.error,
          });
        } else if (pixelResponse.data) {
          setFacebookPixelId(pixelResponse.data);
          loadFacebookPixel(pixelResponse.data);
          window.setTimeout(() => {
            if (window.fbq) window.fbq('track', 'ViewContent');
          }, 100);
        }

        if (categoriesResponse.error) {
          console.error('[Shop] Categories query failed', {
            storeId: mappedStore.id,
            error: categoriesResponse.error,
          });
        }
        setCategories(categoriesResponse.data ?? []);

        if (productsResponse.error) {
          console.error('[Shop] Products query failed', {
            storeId: mappedStore.id,
            error: productsResponse.error,
          });
        }

        const sanitizedProducts: Product[] = (productsResponse.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price),
          image_url: sanitizeImageUrl(p.image_url) ?? null,
          category_id: p.category_id,
          is_featured: p.is_featured ?? false,
        }));

        setProducts(sanitizedProducts);
      } catch (fetchError) {
        console.error('[Shop] Unexpected error while loading public menu', {
          normalizedSlug,
          pathname: location.pathname,
          error: fetchError,
        });
        if (cancelled) return;
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          retryScheduled = true;
          retryTimeout = window.setTimeout(doFetch, 1000 * retryCount);
          return;
        }
        setError('Erro inesperado ao carregar dados');
        setStore(null);
      } finally {
        if (!cancelled && !retryScheduled) {
          setLoading(false);
        }
      }
    }

    // Start fetching immediately — no artificial delay
    void doFetch();

    return () => {
      cancelled = true;
      if (retryTimeout !== null) {
        window.clearTimeout(retryTimeout);
      }
    };
  }, [cleanSlug, location.pathname, slug]);

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

  // Inject per-store PWA manifest so "Add to Home Screen" installs only this store
  // with the merchant's exact name + logo (white-label, never the platform brand).
  useEffect(() => {
    if (!store || !cleanSlug) return;
    const origin = window.location.origin;
    const startUrl = `${origin}/${cleanSlug}/`;
    const scopeUrl = `${origin}/${cleanSlug}/`;
    const logoFromStore = sanitizeImageUrl(store.logo_url);
    // Force the store logo. Only fall back to platform asset if the merchant
    // has not uploaded any logo at all.
    const icon = logoFromStore || `${origin}/logo.png`;
    const shortName = store.name.length > 12 ? store.name.slice(0, 12) : store.name;
    const manifest = {
      name: store.name,
      short_name: shortName,
      description: `Cardápio — ${store.name}`,
      start_url: startUrl,
      id: startUrl,
      scope: scopeUrl,
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#0a0a0a',
      theme_color: store.primary_color || '#f59e0b',
      icons: [
        { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const blobUrl = URL.createObjectURL(blob);

    // Remove ANY existing manifest link (including the static /manifest.json
    // shipped in index.html) so the browser only sees the store-specific one
    // when the install prompt fires.
    document.querySelectorAll('link[rel="manifest"]').forEach((el) => el.remove());
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = blobUrl;
    link.setAttribute('data-store-manifest', cleanSlug);
    document.head.appendChild(link);

    // Wipe ALL existing icon / touch-icon links so the platform logo never
    // leaks into the install prompt, then install store-specific ones.
    document
      .querySelectorAll('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="icon"], link[rel="shortcut icon"]')
      .forEach((el) => el.remove());

    const addLink = (rel: string, href: string, sizes?: string) => {
      const l = document.createElement('link');
      l.rel = rel;
      l.href = href;
      if (sizes) l.setAttribute('sizes', sizes);
      l.setAttribute('data-store-icon', cleanSlug);
      document.head.appendChild(l);
      return l;
    };
    const addedLinks = [
      addLink('icon', icon),
      addLink('shortcut icon', icon),
      addLink('apple-touch-icon', icon),
      addLink('apple-touch-icon', icon, '152x152'),
      addLink('apple-touch-icon', icon, '167x167'),
      addLink('apple-touch-icon', icon, '180x180'),
      addLink('apple-touch-icon-precomposed', icon),
    ];

    const setMeta = (name: string, content: string) => {
      let m = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!m) {
        m = document.createElement('meta');
        m.name = name;
        document.head.appendChild(m);
      }
      const prev = m.content;
      m.content = content;
      return { el: m, prev };
    };
    const appleTitle = setMeta('apple-mobile-web-app-title', store.name);
    const appName = setMeta('application-name', store.name);
    const themeMeta = setMeta('theme-color', store.primary_color || '#f59e0b');
    const msTile = setMeta('msapplication-TileImage', icon);

    return () => {
      URL.revokeObjectURL(blobUrl);
      link.remove();
      addedLinks.forEach((l) => l.remove());
      appleTitle.el.content = appleTitle.prev;
      appName.el.content = appName.prev;
      themeMeta.el.content = themeMeta.prev;
      msTile.el.content = msTile.prev;
    };
  }, [store, cleanSlug]);


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

  const categorySummary = categories
    .map((category) => category.name.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' • ');
  const ogTitle = `${store.name} - Cardápio Digital`;
  const ogDescription = `Faça seu pedido online no ${store.name} via DeliveryPro`
    + (categorySummary ? ` • ${categorySummary}` : '');
  const storeLogoSanitized = sanitizeImageUrl(store.logo_url);
  const storeCoverSanitized = sanitizeImageUrl(store.cover_url);
  // Prefer the store's own cover/logo so WhatsApp previews show the merchant's identity, not DeliveryPro's.
  const ogImage = storeCoverSanitized || storeLogoSanitized || `${window.location.origin}/logo.png?v=4`;
  const ogUrl = `https://${window.location.hostname}/${cleanSlug}`;

  return (
    <StoreThemeProvider primaryColor={store.primary_color ?? null} templateStyle={store.store_template_style ?? null} bgColor={store.bg_color ?? null} cardStyle={store.card_style ?? null}>
      <Helmet>
        <title>{ogTitle}</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={store.name} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={store.name} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="apple-mobile-web-app-title" content={store.name} />
        <meta name="application-name" content={store.name} />
        <link rel="icon" type="image/png" href={storeLogoSanitized || '/logo.png?v=4'} />
        <link rel="apple-touch-icon" href={storeLogoSanitized || '/logo.png?v=4'} />
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
            storeName={store.name}
            storeSlug={cleanSlug}
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
