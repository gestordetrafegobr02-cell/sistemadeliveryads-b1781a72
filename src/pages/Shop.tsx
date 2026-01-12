import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ProductCard';
import { CartSheet } from '@/components/CartSheet';
import { CartProvider } from '@/lib/cart';
import { Skeleton } from '@/components/ui/skeleton';

interface Store {
  id: string;
  name: string;
  whatsapp: string | null;
  facebook_pixel_id: string | null;
  logo_url: string | null;
  delivery_fee: number | null;
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

  useEffect(() => {
    async function fetchData() {
      if (!slug) return;

      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (storeError || !storeData) {
        setError('Loja não encontrada');
        setLoading(false);
        return;
      }

      setStore(storeData);

      // Load Facebook Pixel
      if (storeData.facebook_pixel_id) {
        loadFacebookPixel(storeData.facebook_pixel_id);
        setTimeout(() => {
          if (window.fbq) {
            window.fbq('track', 'ViewContent');
          }
        }, 100);
      }

      // Fetch categories and products
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

      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setLoading(false);
    }

    fetchData();
  }, [slug]);

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
    products: products.filter((p) => p.category_id === cat.id),
  }));

  const uncategorizedProducts = products.filter((p) => !p.category_id);

  return (
    <CartProvider>
      <div className="min-h-screen bg-background pb-24">
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

        {/* Menu */}
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
          {productsByCategory.map((category) => (
            category.products.length > 0 && (
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
                      price={Number(product.price)}
                      image_url={product.image_url || undefined}
                    />
                  ))}
                </div>
              </section>
            )
          ))}

          {uncategorizedProducts.length > 0 && (
            <section>
              <h2 className="font-display text-2xl text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full" />
                Outros
              </h2>
              <div className="space-y-4">
                {uncategorizedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    description={product.description || undefined}
                    price={Number(product.price)}
                    image_url={product.image_url || undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {products.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                Nenhum produto disponível no momento.
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
        />
      </div>
    </CartProvider>
  );
}
