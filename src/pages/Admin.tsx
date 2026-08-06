import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, Trash2, LogOut, Store, Package, Tag, ExternalLink, ClipboardList, Power, Shield, Flame, ShoppingCart, BarChart3, Copy, Link, BellRing, CreditCard, ArrowUp, ArrowDown, XCircle, ShieldCheck, Printer, Users, Utensils, Layers, Sparkles } from 'lucide-react';
import { PrintCashbackSettings } from '@/components/PrintCashbackSettings';
import { printOrderReceipt } from '@/lib/printReceipt';
import { AccountSettingsDialog } from '@/components/AccountSettingsDialog';
import { TeamTab } from '@/components/TeamTab';
import { PdvTab } from '@/components/pdv/PdvTab';


import { toast } from 'sonner';
import { OrderStatusBadge, getAllStatuses } from '@/components/OrderStatusBadge';
import { ImageUpload } from '@/components/ImageUpload';
import { MenuImagePicker } from '@/components/MenuImagePicker';
import { getErrorMessage } from '@/lib/errorMapper';
import { CategoryReorder } from '@/components/CategoryReorder';
import { ProductReorder } from '@/components/ProductReorder';
import { StoreHoursEditor } from '@/components/StoreHoursEditor';
import { WhatsAppNotifyButton } from '@/components/WhatsAppNotifyButton';
import { ProductModifiersEditor } from '@/components/ProductModifiersEditor';
import { ModifierLibraryTab } from '@/components/ModifierLibraryTab';
import { OpeningHours } from '@/lib/storeHours';
import { RecoveryMessageEditor } from '@/components/RecoveryMessageEditor';
import { RecoveryDelayEditor } from '@/components/RecoveryDelayEditor';
import { AbandonedCartsTab } from '@/components/AbandonedCartsTab';
import { UpsellSettingsCard } from '@/components/UpsellSettingsCard';
import { ReportsTab } from '@/components/ReportsTab';
import { StoreThemeEditor } from '@/components/StoreThemeEditor';
import { getStoreUrl } from '@/lib/siteConfig';
import { AIImportMenuDialog } from '@/components/AIImportMenuDialog';
import { StoreTemplateSelector } from '@/components/StoreTemplateSelector';
import { usePendingOrderAlert } from '@/hooks/usePendingOrderAlert';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  whatsapp: string | null;
  pix_key: string | null;
  facebook_pixel_id: string | null;
  delivery_fee: number | null;
  is_open_manual: boolean;
  logo_url: string | null;
  cover_url: string | null;
  opening_hours: OpeningHours | null;
  recovery_message_template: string | null;
  primary_color: string | null;
  store_template_style: string | null;
  auto_print: boolean;
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
  is_available: boolean;
  is_featured: boolean;
  has_addons?: boolean;
  has_free_addons?: boolean;
  free_addons_limit?: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  items: unknown;
  total: number;
  status: string | null;
  address: string | null;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [store, setStore] = useState<StoreData | null>(null);
  const [role, setRole] = useState<'owner' | 'manager' | 'attendant' | 'kitchen' | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [abandonedCount, setAbandonedCount] = useState(0);
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [recoveryDelayMinutes, setRecoveryDelayMinutes] = useState(15);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  const isOwner = role === 'owner';
  const canManage = role === 'owner' || role === 'manager';
  const canSeeOrders = role !== null; // all roles see orders
  const canSeePdv = role === 'owner' || role === 'manager' || role === 'attendant';
  const canSeeReports = canManage;
  const canSeeRecovery = canManage;
  const canSeeStoreSettings = canManage;
  const canSeeTeam = isOwner;

  // Pending orders trigger the looping alert + flashing border.
  const pendingCount = orders.filter(
    (o) => !o.status || o.status === 'pending'
  ).length;
  const { unlocked: alertsUnlocked, unlock: unlockAlerts } = usePendingOrderAlert(pendingCount);

  // Store form
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [storeBgColor, setStoreBgColor] = useState<string | null>(null);
  const [storeCardStyle, setStoreCardStyle] = useState<string | null>('rounded');

  // Product dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productImage, setProductImage] = useState('');
  const [productCategory, setProductCategory] = useState<string>('');
  const [hasAddons, setHasAddons] = useState(true);
  const [hasFreeAddons, setHasFreeAddons] = useState(false);
  const [freeAddonsLimit, setFreeAddonsLimit] = useState('0');

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');


  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Resolve membership: owner OR team member (attendant/manager/kitchen)
    const { data: myStore } = await supabase.rpc('get_my_store');
    const membership = Array.isArray(myStore) ? myStore[0] : null;

    if (!membership?.store_id) {
      setStore(null);
      setRole(null);
      setLoading(false);
      return;
    }

    setRole(membership.role as 'owner' | 'manager' | 'attendant' | 'kitchen');

    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('id', membership.store_id)
      .maybeSingle();

    if (storeData) {
      const themedStoreData = storeData as typeof storeData & {
        bg_color?: string | null;
        card_style?: string | null;
      };

      const mappedStore: StoreData = {
        id: storeData.id,
        name: storeData.name,
        slug: storeData.slug,
        whatsapp: storeData.whatsapp,
        pix_key: storeData.pix_key,
        facebook_pixel_id: storeData.facebook_pixel_id,
        delivery_fee: storeData.delivery_fee,
        is_open_manual: storeData.is_open_manual ?? true,
        logo_url: storeData.logo_url,
        cover_url: storeData.cover_url ?? null,
        opening_hours: storeData.opening_hours as OpeningHours | null,
        recovery_message_template: storeData.recovery_message_template,
        primary_color: storeData.primary_color ?? null,
        store_template_style: storeData.store_template_style ?? 'default',
        auto_print: (storeData as { auto_print?: boolean }).auto_print ?? false,
      };
      setStore(mappedStore);
      setStoreName(storeData.name);
      setStoreSlug(storeData.slug);
      setWhatsapp(storeData.whatsapp || '');
      setPixKey(storeData.pix_key || '');
      setPixelId(storeData.facebook_pixel_id || '');
      setDeliveryFee(storeData.delivery_fee ? String(storeData.delivery_fee) : '');
      setLogoUrl(storeData.logo_url || '');
      setCoverUrl(storeData.cover_url || '');
      setStoreBgColor(themedStoreData.bg_color ?? null);
      setStoreCardStyle(themedStoreData.card_style ?? 'rounded');

      const [catRes, prodRes, ordersRes] = await Promise.all([
        supabase.from('categories').select('*').eq('store_id', storeData.id).order('sort_order'),
        supabase.from('products').select('*').eq('store_id', storeData.id).order('sort_order'),
        supabase.from('orders').select('*').eq('store_id', storeData.id).order('created_at', { ascending: false }),
      ]);

      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setOrders(ordersRes.data || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Personalize PWA manifest + title with store name and role
  useEffect(() => {
    if (!store?.name) return;
    const roleLabels: Record<string, string> = {
      owner: 'Admin',
      manager: 'Gerente',
      attendant: 'Atendente',
      kitchen: 'Cozinha',
    };
    const roleLabel = role ? roleLabels[role] ?? 'Admin' : 'Admin';
    const appName = `${store.name} - ${roleLabel}`;
    const shortName = role && role !== 'owner' ? roleLabel : store.name;
    const icon = store.logo_url || `${window.location.origin}/logo.png?v=4`;
    const themeColor = store.primary_color || '#f59e0b';

    document.title = appName;
    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (el) el.setAttribute(attr, value);
    };
    setMeta('meta[name="apple-mobile-web-app-title"]', 'content', shortName);
    setMeta('meta[name="theme-color"]', 'content', themeColor);

    const manifest = {
      name: appName,
      short_name: shortName,
      description: `Painel ${roleLabel} da loja ${store.name}`,
      start_url: '/admin',
      id: `/admin?store=${store.slug}`,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#0a0a0a',
      theme_color: themeColor,
      icons: [
        { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: icon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    };
    const href =
      'data:application/manifest+json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(manifest));
    let link = document.head.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'manifest');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);

    const setIcon = (rel: string, sizes?: string) => {
      const sel = `link[rel="${rel}"]` + (sizes ? `[sizes="${sizes}"]` : '');
      const el = document.head.querySelector(sel) as HTMLLinkElement | null;
      if (el) el.setAttribute('href', icon);
    };
    setIcon('icon');
    setIcon('shortcut icon');
    setIcon('apple-touch-icon');
    setIcon('apple-touch-icon', '152x152');
    setIcon('apple-touch-icon', '167x167');
    setIcon('apple-touch-icon', '180x180');
  }, [store?.name, store?.slug, store?.logo_url, store?.primary_color, role]);



  // Realtime subscription for orders (new-order notification)
  useEffect(() => {
    const storeId = store?.id;
    if (!storeId) return;

    const channel = supabase
      .channel(`orders-realtime-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          const order = payload.new as {
            id: string;
            customer_name?: string;
            customer_phone?: string | null;
            address?: string | null;
            payment_method?: string | null;
            items?: unknown;
            total?: number;
            created_at?: string;
          };
          toast.success(`🔔 Novo pedido de ${order.customer_name ?? 'cliente'}!`, {
            description: order.total ? `Total: R$ ${Number(order.total).toFixed(2).replace('.', ',')}` : undefined,
            duration: 8000,
            action: !alertsUnlocked
              ? {
                  label: 'Ativar alertas',
                  onClick: () => { void unlockAlerts(); },
                }
              : undefined,
          });
          // Auto-print if enabled for this store
          if (store?.auto_print && Array.isArray(order.items)) {
            printOrderReceipt({
              id: order.id,
              customer_name: order.customer_name ?? 'Cliente',
              customer_phone: order.customer_phone,
              address: order.address,
              payment_method: order.payment_method,
              items: order.items as { name: string; quantity: number; price: number; modifiers?: { name: string; price: number }[]; observation?: string | null }[],
              total: Number(order.total ?? 0),
              created_at: order.created_at ?? new Date().toISOString(),
              store_name: store?.name ?? 'Loja',
            });
          }
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id, store?.auto_print, store?.name, alertsUnlocked, unlockAlerts, fetchData]);


  // Validate Facebook Pixel ID format (15-20 digits only)
  function isValidPixelId(id: string): boolean {
    if (!id) return true; // Empty is allowed
    return /^[0-9]{15,20}$/.test(id);
  }

  async function handleSaveStore() {
    if (!storeName.trim() || !storeSlug.trim()) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    // Validate Facebook Pixel ID to prevent XSS
    if (pixelId && !isValidPixelId(pixelId)) {
      toast.error('Facebook Pixel ID inválido. Deve conter apenas 15-20 dígitos numéricos.');
      return;
    }

    setSaving(true);

    try {
      const storePayload = {
        name: storeName,
        slug: storeSlug.toLowerCase().replace(/\s+/g, '-'),
        whatsapp: whatsapp || null,
        pix_key: pixKey || null,
        facebook_pixel_id: pixelId || null,
        delivery_fee: deliveryFee ? parseFloat(deliveryFee.replace(',', '.')) : 0,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
      };

      let error;

      if (store) {
        // UPDATE existing store
        const result = await supabase
          .from('stores')
          .update(storePayload)
          .eq('id', store.id)
          .select()
          .single();
        error = result.error;
      } else {
        // INSERT new store
        const result = await supabase
          .from('stores')
          .insert({ ...storePayload, owner_id: user!.id })
          .select()
          .single();
        error = result.error;
      }

      if (error) {
        if (error.message.includes('duplicate') || error.code === '23505') {
          toast.error('Esse slug já está em uso');
        } else {
          toast.error(getErrorMessage(error));
        }
      } else {
        toast.success(store ? 'Loja atualizada!' : 'Loja criada!');
        await fetchData();
      }
    } catch {
      toast.error('Erro inesperado ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCategory() {
    if (!categoryName.trim() || !store) return;

    const { error } = await supabase.from('categories').insert({
      store_id: store.id,
      name: categoryName,
      sort_order: categories.length,
    });

    if (error) {
      toast.error('Erro ao criar categoria');
    } else {
      toast.success('Categoria criada!');
      setCategoryName('');
      setCategoryDialogOpen(false);
      fetchData();
    }
  }

  async function handleDeleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir categoria');
    } else {
      toast.success('Categoria excluída');
      fetchData();
    }
  }

  function openProductDialog(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setProductName(product.name);
      setProductDescription(product.description || '');
      setProductPrice(String(product.price));
      setProductImage(product.image_url || '');
      setProductCategory(product.category_id || '');
      setHasAddons(product.has_addons ?? true);
      setHasFreeAddons(product.has_free_addons ?? false);
      setFreeAddonsLimit(String(product.free_addons_limit ?? 0));
    } else {
      setEditingProduct(null);
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setProductImage('');
      setProductCategory('');
      setHasAddons(true);
      setHasFreeAddons(false);
      setFreeAddonsLimit('0');
    }
    setProductDialogOpen(true);
  }

  async function handleSaveProduct() {
    if (!productName.trim() || !productPrice.trim() || !store) return;

    const productData = {
      store_id: store.id,
      name: productName,
      description: productDescription || null,
      price: parseFloat(productPrice.replace(',', '.')),
      image_url: productImage || null,
      category_id: productCategory || null,
      has_addons: hasAddons,
      has_free_addons: hasFreeAddons,
      free_addons_limit: parseInt(freeAddonsLimit) || 0,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast.error('Erro ao atualizar produto');
      } else {
        toast.success('Produto atualizado!');
      }
    } else {
      const { error } = await supabase.from('products').insert({
        ...productData,
        sort_order: products.length,
      });

      if (error) {
        toast.error('Erro ao criar produto');
      } else {
        toast.success('Produto criado!');
      }
    }

    setProductDialogOpen(false);
    fetchData();
  }

  async function handleDeleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir produto');
    } else {
      toast.success('Produto excluído');
      fetchData();
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl text-gradient">Painel Admin</h1>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/super-admin')}
                className="gap-2"
              >
                <Shield className="w-4 h-4" />
                Super Admin
              </Button>
            )}
            {store && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/${store.slug}`, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ver Loja
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAccountDialogOpen(true)}
              className="gap-2"
              title="Alterar email e senha"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Minha Conta</span>
            </Button>
            
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <AccountSettingsDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        currentEmail={user?.email}
      />


      {/* Persistent overlay: blocks until merchant unlocks audio alerts */}
      {!alertsUnlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <BellRing className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-display text-2xl text-foreground">Ativar Alertas Sonoros</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Para receber novos pedidos em tempo real com som contínuo, libere os alertas de áudio.
              Eles tocarão até você aceitar o pedido.
            </p>
            <Button
              size="lg"
              className="mt-5 w-full bg-primary text-primary-foreground"
              onClick={() => void unlockAlerts()}
            >
              <BellRing className="mr-2 h-4 w-4" /> Ativar Alertas Sonoros
            </Button>
          </div>
        </div>
      )}

      {/* Flashing red border while there are pending orders */}
      {pendingCount > 0 && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[90] border-[6px] border-destructive animate-pulse"
        />
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        {pendingCount > 0 && (
          <div className="mb-4 rounded-lg border-2 border-destructive bg-destructive/10 p-4 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <BellRing className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {pendingCount} pedido{pendingCount > 1 ? 's' : ''} aguardando aceitação
                </p>
                <p className="text-xs text-muted-foreground">
                  O alerta sonoro continuará até você aceitar (mude o status para "Preparando").
                </p>
              </div>
            </div>
          </div>
        )}


        <Tabs defaultValue="orders" className="space-y-6">
          <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
            <TabsList className="bg-secondary inline-flex w-max min-w-full">
              {canSeeOrders && (
                <TabsTrigger value="orders" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Pedidos
                </TabsTrigger>
              )}
              {canSeePdv && (
                <TabsTrigger value="pdv" className="gap-2">
                  <Utensils className="w-4 h-4" />
                  PDV
                </TabsTrigger>
              )}
              {canManage && (
                <TabsTrigger value="products" className="gap-2">
                  <Package className="w-4 h-4" />
                  Produtos
                </TabsTrigger>
              )}
              {canManage && (
                <TabsTrigger value="categories" className="gap-2">
                  <Tag className="w-4 h-4" />
                  Categorias
                </TabsTrigger>
              )}
              {canManage && (
                <TabsTrigger value="modifiers" className="gap-2">
                  <Layers className="w-4 h-4" />
                  Adicionais
                </TabsTrigger>
              )}
              {canSeeReports && (
                <TabsTrigger value="reports" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Relatórios
                </TabsTrigger>
              )}
              {canSeeRecovery && (
                <TabsTrigger value="recovery" className="gap-2 relative">
                  <Flame className="w-4 h-4" />
                  Radar
                  {abandonedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-pulse">
                      {abandonedCount > 9 ? '9+' : abandonedCount}
                    </span>
                  )}
                </TabsTrigger>
              )}
              {canSeeStoreSettings && (
                <TabsTrigger value="store" className="gap-2">
                  <Store className="w-4 h-4" />
                  Loja
                </TabsTrigger>
              )}
              {canSeeTeam && (
                <TabsTrigger value="team" className="gap-2">
                  <Users className="w-4 h-4" />
                  Equipe
                </TabsTrigger>
              )}
            </TabsList>
          </div>


          {/* Store Tab */}
          <TabsContent value="store">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Configurações da Loja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Logo Upload */}
                {store && (
                  <ImageUpload
                    value={logoUrl}
                    onChange={setLogoUrl}
                    folder="logos"
                    storeId={store.id}
                    label="Logo da Loja (Redondo)"
                  />
                )}

                {/* Cover/Banner Upload */}
                {store && (
                  <div>
                    <ImageUpload
                      value={coverUrl}
                      onChange={setCoverUrl}
                      folder="covers"
                      storeId={store.id}
                      label="Banner de Capa (aparece no topo do cardápio)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Tamanho ideal: 1080x608 pixels (16:9). Evite informações no centro inferior, pois a logo será sobreposta aqui.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Loja</Label>
                    <Input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Burger House"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Slug (URL)</Label>
                    <Input
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value)}
                      placeholder="burger-house"
                      className="mt-1 bg-secondary border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Sua loja: {(typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\//, '') : 'deliverypro.site')}/{storeSlug || 'seu-slug'}
                    </p>
                  </div>
                </div>

                {/* Link do Cardápio - Copiar */}
                {store && (
                  <div className="p-4 glass-card rounded-lg space-y-2">
                    <Label className="flex items-center gap-2 text-base">
                      <Link className="w-4 h-4" />
                      Link do Cardápio
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : 'https://deliverypro.site'}/${store.slug}`}
                        className="bg-secondary border-border font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        className="gap-2 shrink-0"
                        onClick={async () => {
                          const url = getStoreUrl(store.slug);
                          try {
                            await navigator.clipboard.writeText(url);
                            toast.success('Link copiado!');
                          } catch {
                            // Fallback for mobile browsers without clipboard API
                            const textarea = document.createElement('textarea');
                            textarea.value = url;
                            textarea.style.position = 'fixed';
                            textarea.style.opacity = '0';
                            document.body.appendChild(textarea);
                            textarea.focus();
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            toast.success('Link copiado!');
                          }
                        }}
                      >
                        <Copy className="w-4 h-4" />
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Compartilhe este link com seus clientes
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>WhatsApp (com DDD)</Label>
                    <Input
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="5511999999999"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Chave PIX</Label>
                    <Input
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="sua@chave.pix"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Facebook Pixel ID</Label>
                    <Input
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      placeholder="123456789"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <Label>Taxa de Entrega Padrão (R$)</Label>
                    <Input
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      placeholder="5,00"
                      className="mt-1 bg-secondary border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Taxa fixa cobrada para entregas
                    </p>
                  </div>
                </div>

                {/* Store Open/Close Toggle */}
                {store && (
                  <div className="p-4 glass-card rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Power className={`w-5 h-5 ${store.is_open_manual ? 'text-green-500' : 'text-destructive'}`} />
                        <div>
                          <Label className="text-base">Loja {store.is_open_manual ? 'Aberta' : 'Fechada'}</Label>
                          <p className="text-xs text-muted-foreground">
                            {store.is_open_manual 
                              ? 'Clientes podem fazer pedidos' 
                              : 'Pedidos desabilitados temporariamente'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={store.is_open_manual}
                        onCheckedChange={async (checked) => {
                          const { error } = await supabase
                            .from('stores')
                            .update({ is_open_manual: checked })
                            .eq('id', store.id);
                          
                          if (error) {
                            toast.error('Erro ao atualizar status');
                          } else {
                            setStore({ ...store, is_open_manual: checked });
                            toast.success(checked ? 'Loja aberta!' : 'Loja fechada!');
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Store Hours Editor */}
                {store && (
                  <div className="p-4 glass-card rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Horários de Funcionamento</Label>
                        <p className="text-xs text-muted-foreground">
                          Configure os horários de abertura e fechamento
                        </p>
                      </div>
                      <StoreHoursEditor
                        storeId={store.id}
                        currentHours={store.opening_hours}
                        onSave={fetchData}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSaveStore}
                  disabled={saving}
                  className="btn-glow bg-primary text-primary-foreground"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {store ? 'Salvar Alterações' : 'Criar Loja'}
                </Button>

                {/* Recovery Message Editor */}
                {store && (
                  <div className="space-y-4">
                    <RecoveryDelayEditor 
                      storeId={store.id} 
                      onDelayChange={setRecoveryDelayMinutes}
                    />
                    <RecoveryMessageEditor storeId={store.id} storeName={store.name} />
                  </div>
                )}

                {/* Upsell Settings */}
                {store && (
                  <UpsellSettingsCard 
                    storeId={store.id} 
                    categories={categories}
                    products={products}
                  />
                )}

                {/* Template Selector */}
                {store && (
                  <StoreTemplateSelector
                    storeId={store.id}
                    currentTemplate={store.store_template_style || 'default'}
                    onTemplateChange={(template) => setStore({ ...store, store_template_style: template })}
                  />
                )}

                {/* Theme Customization */}
                {store && (
                  <StoreThemeEditor 
                    storeId={store.id}
                    currentColor={store.primary_color}
                    currentBgColor={storeBgColor}
                    currentCardStyle={storeCardStyle}
                    onThemeChange={(theme) => {
                      setStore({ ...store, primary_color: theme.primary_color });
                      setStoreBgColor(theme.bg_color);
                      setStoreCardStyle(theme.card_style);
                    }}
                  />
                )}

                {/* Print + Cashback */}
                {store && (
                  <PrintCashbackSettings storeId={store.id} storeName={store.name} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="font-display text-xl">Categorias</CardTitle>
                <div className="flex items-center gap-2">
                  {categories.length > 1 && (
                    <CategoryReorder categories={categories} onReorder={fetchData} />
                  )}
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 bg-primary text-primary-foreground" disabled={!store}>
                        <Plus className="w-4 h-4" />
                        Nova Categoria
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="font-display">Nova Categoria</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Nome</Label>
                          <Input
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="Hambúrgueres"
                            className="mt-1 bg-secondary border-border"
                          />
                        </div>
                        <Button onClick={handleSaveCategory} className="w-full bg-primary text-primary-foreground">
                          Criar Categoria
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!store ? (
                  <p className="text-muted-foreground text-center py-8">
                    Crie sua loja primeiro para adicionar categorias.
                  </p>
                ) : categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma categoria ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((cat, index) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 glass-card"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display text-xl">Produtos</CardTitle>
                <div className="flex gap-2">
                  {store && products.length > 1 && (
                    <ProductReorder
                      products={products.map((p) => ({
                        id: p.id,
                        name: p.name,
                        category_id: p.category_id,
                        image_url: p.image_url,
                      }))}
                      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
                      onReorder={fetchData}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setAiImportOpen(true)}
                    disabled={!store}
                  >
                    <Sparkles className="w-4 h-4" />
                    Importar com IA
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 bg-primary text-primary-foreground"
                    onClick={() => openProductDialog()}
                    disabled={!store}
                  >
                    <Plus className="w-4 h-4" />
                    Novo Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!store ? (
                  <p className="text-muted-foreground text-center py-8">
                    Crie sua loja primeiro para adicionar produtos.
                  </p>
                ) : products.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum produto ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-3 glass-card"
                      >
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-14 h-14 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{product.name}</h4>
                            {product.is_featured && (
                              <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-primary font-semibold">
                            R$ {Number(product.price).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Featured toggle */}
                          <div className="flex items-center gap-2" title="Destacar produto">
                            <Switch
                              checked={product.is_featured}
                              onCheckedChange={async (checked) => {
                                const { error } = await supabase
                                  .from('products')
                                  .update({ is_featured: checked })
                                  .eq('id', product.id);
                                
                                if (error) {
                                  toast.error('Erro ao atualizar destaque');
                                } else {
                                  toast.success(checked ? 'Produto destacado!' : 'Destaque removido');
                                  fetchData();
                                }
                              }}
                            />
                            <Flame className={`w-4 h-4 ${product.is_featured ? 'text-orange-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex gap-2">
                            <ProductModifiersEditor
                              productId={product.id}
                              productName={product.name}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openProductDialog(product)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modifiers Library Tab */}
          <TabsContent value="modifiers">
            {store ? (
              <ModifierLibraryTab
                storeId={store.id}
                products={products.map((p) => ({ id: p.id, name: p.name }))}
              />
            ) : (
              <p className="text-muted-foreground text-center py-8">Crie sua loja primeiro.</p>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display text-xl">Pedidos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {store && (
                  <div className="mb-4">
                    <PushNotificationToggle storeId={store.id} />
                  </div>
                )}
                {!store ? (
                  <p className="text-muted-foreground text-center py-8">
                    Crie sua loja primeiro para ver pedidos.
                  </p>
                ) : orders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum pedido ainda.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4 glass-card space-y-3">
                        {/* Order Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <p className="font-medium text-foreground">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <OrderStatusBadge status={order.status} />
                            {order.payment_status === 'Pago' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                ✓ Pagamento Confirmado
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="text-sm text-muted-foreground">
                          {Array.isArray(order.items) && (order.items as OrderItem[]).map((item, i, arr) => (
                            <span key={i}>{item.quantity}x {item.name}{i < arr.length - 1 ? ', ' : ''}</span>
                          ))}
                        </div>

                        {/* Address if available */}
                        {order.address && (
                          <p className="text-xs text-muted-foreground">📍 {order.address}</p>
                        )}

                        {/* Order Footer */}
                        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-border">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-semibold text-primary">
                              R$ {Number(order.total).toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-sm text-muted-foreground capitalize">
                              {order.payment_method || '-'}
                            </span>
                          </div>
                          
                          {/* Status Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={order.status || 'pending'}
                              onValueChange={async (newStatus) => {
                                const { error } = await supabase
                                  .from('orders')
                                  .update({ status: newStatus })
                                  .eq('id', order.id);
                                
                                if (error) {
                                  toast.error('Erro ao atualizar status');
                                } else {
                                  toast.success('Status atualizado!');
                                  fetchData();
                                }
                              }}
                            >
                              <SelectTrigger className="w-[160px] bg-secondary border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getAllStatuses().map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <WhatsAppNotifyButton
                              orderId={order.id}
                              customerName={order.customer_name}
                              customerPhone={order.customer_phone}
                              status={order.status}
                              storeName={store?.name || 'Loja'}
                            />

                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => printOrderReceipt({
                                id: order.id,
                                customer_name: order.customer_name,
                                customer_phone: order.customer_phone,
                                address: order.address,
                                payment_method: order.payment_method,
                                items: Array.isArray(order.items) ? (order.items as OrderItem[]) as unknown as { name: string; quantity: number; price: number }[] : [],
                                total: Number(order.total),
                                created_at: order.created_at,
                                store_name: store?.name || 'Loja',
                              })}
                            >
                              <Printer className="w-4 h-4" />
                              Imprimir
                            </Button>

                            {order.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                                onClick={async () => {
                                  if (!confirm('Cancelar este pedido? Ele será excluído das receitas e métricas.')) return;
                                  const { error } = await supabase
                                    .from('orders')
                                    .update({ status: 'cancelled' })
                                    .eq('id', order.id);
                                  if (error) {
                                    toast.error('Erro ao cancelar pedido');
                                  } else {
                                    toast.success('Pedido cancelado');
                                    fetchData();
                                  }
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                                Cancelar
                              </Button>
                            )}

                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                await supabase.from('orders').delete().eq('id', order.id);
                                toast.success('Pedido excluído');
                                fetchData();
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recovery Tab */}
          <TabsContent value="recovery">
            {store ? (
              <AbandonedCartsTab
                storeId={store.id}
                storeName={store.name}
                recoveryTemplate={store.recovery_message_template}
                recoveryDelayMinutes={recoveryDelayMinutes}
                onAbandonedCountChange={setAbandonedCount}
              />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-8">
                  <p className="text-muted-foreground text-center">
                    Crie sua loja primeiro para ver carrinhos abandonados.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>


          {/* Reports Tab */}
          <TabsContent value="reports">
            {store ? (
              <ReportsTab storeId={store.id} />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-8">
                  <p className="text-muted-foreground text-center">
                    Crie sua loja primeiro para ver relatórios.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PDV Tab */}
          <TabsContent value="pdv">
            {store ? (
              <PdvTab storeId={store.id} storeName={store.name} canManageTables />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-8">
                  <p className="text-muted-foreground text-center">Crie sua loja primeiro para usar o PDV.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            {store ? (
              <TeamTab storeId={store.id} />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-8">
                  <p className="text-muted-foreground text-center">
                    Crie sua loja primeiro para gerenciar a equipe.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Product Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="X-Bacon Especial"
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Hambúrguer artesanal com bacon crocante..."
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="29,90"
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              {store && (
                <ImageUpload
                  value={productImage}
                  onChange={setProductImage}
                  folder="products"
                  storeId={store.id}
                  label="Imagem do Produto"
                />
              )}
              <MenuImagePicker value={productImage} onSelect={setProductImage} />
              <div>
                <Label>Categoria</Label>
                <Select 
                  value={productCategory || "none"} 
                  onValueChange={(val) => setProductCategory(val === "none" ? "" : val)}
                >
                  <SelectTrigger className="mt-1 bg-secondary border-border">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 p-4 glass-card rounded-lg border border-border/40">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Habilitar Adicionais</Label>
                    <p className="text-xs text-muted-foreground">O cliente poderá escolher adicionais para este produto</p>
                  </div>
                  <Switch checked={hasAddons} onCheckedChange={setHasAddons} />
                </div>

                {hasAddons && (
                  <>
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Adicionais Grátis</Label>
                          <p className="text-xs text-muted-foreground">Permitir uma quantidade de adicionais sem custo</p>
                        </div>
                        <Switch checked={hasFreeAddons} onCheckedChange={setHasFreeAddons} />
                      </div>
                    </div>

                    {hasFreeAddons && (
                      <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1">
                        <Label>Quantidade de Adicionais Grátis</Label>
                        <Input
                          type="number"
                          value={freeAddonsLimit}
                          onChange={(e) => setFreeAddonsLimit(e.target.value)}
                          placeholder="Ex: 5"
                          className="bg-secondary border-border"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Ex: Se definir 5, os primeiros 5 itens selecionados terão preço R$ 0,00.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Button 
                onClick={handleSaveProduct} 
                className="w-full bg-primary text-primary-foreground h-12 rounded-xl text-base font-semibold"
              >
                {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {store && (
          <AIImportMenuDialog
            open={aiImportOpen}
            onOpenChange={setAiImportOpen}
            storeId={store.id}
            existingCategories={categories.map((c) => ({ id: c.id, name: c.name }))}
            onImported={() => fetchData()}
          />
        )}
      </main>
    </div>
  );
}
