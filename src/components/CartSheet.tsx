import { useState, useEffect } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, MapPin, Truck, Store, Loader2, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/lib/cart';
import { supabase } from '@/integrations/supabase/client';
import { hapticSuccess } from '@/lib/haptics';

import { z } from 'zod';
import { UpsellModal } from './UpsellModal';
import { useAbandonedCartTracking } from '@/hooks/useAbandonedCartTracking';

const checkoutSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  orderType: z.enum(['delivery', 'pickup']),
  zipCode: z.string().max(15).optional(),
  street: z.string().max(200).optional(),
  number: z.string().max(20).optional(),
  neighborhood: z.string().max(100).optional(),
  complement: z.string().max(100).optional(),
  referencePoint: z.string().max(200).optional(),
  paymentMethod: z.enum(['cash', 'card', 'pix']),
  changeFor: z.string().max(20).optional(),
});

interface CartSheetProps {
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  whatsapp?: string;
  deliveryFee?: number;
  pixKey?: string;
  onPurchase?: () => void;
  onOpen?: () => void;
  isStoreOpen?: boolean;
}

interface StoreUpsellConfig {
  upsell_enabled: boolean;
}

interface CheckoutOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  modifiers: { id: string; name: string; price: number }[];
  observation: string | null;
}

export function CartSheet({ storeId, storeName, storeSlug, whatsapp, deliveryFee = 0, pixKey, onPurchase, onOpen, isStoreOpen = true }: CartSheetProps) {
  const { items, updateQuantity, removeItem, total, itemCount, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellConfig, setUpsellConfig] = useState<StoreUpsellConfig | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('pix');
  const [changeFor, setChangeFor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Abandoned cart tracking
  const cartItemsForTracking = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const { markAsConverted, saveImmediately } = useAbandonedCartTracking(
    storeId,
    cartItemsForTracking,
    total,
    name,
    phone
  );

  // Fetch upsell config
  useEffect(() => {
    async function fetchUpsellConfig() {
      if (!storeId) return;
      try {
        const { data: storeData, error } = await supabase
          .from('stores')
          .select('upsell_enabled')
          .eq('id', storeId)
          .maybeSingle();
        if (error || !storeData) {
          setUpsellConfig({ upsell_enabled: true });
          return;
        }
        setUpsellConfig({ upsell_enabled: storeData.upsell_enabled ?? false });
      } catch {
        setUpsellConfig({ upsell_enabled: true });
      }
    }
    fetchUpsellConfig();
  }, [storeId]);

  async function shouldShowUpsell(): Promise<boolean> {
    if (!upsellConfig?.upsell_enabled) return false;
    if (!storeId || items.length === 0) return false;
    const productIds = items.map((item) => item.id);
    const { data: upsellProducts, error } = await supabase.rpc('get_personalized_upsell', {
      p_store_id: storeId,
      p_cart_product_ids: productIds,
      p_limit: 3,
    });
    if (error) return false;
    return Boolean(upsellProducts && upsellProducts.length > 0);
  }

  async function handleProceedToCheckout() {
    if (!validateCheckoutForm()) return;
    try {
      const showUpsell = await shouldShowUpsell();
      if (showUpsell) {
        setUpsellOpen(true);
      } else {
        await handleCheckout();
      }
    } catch (err) {
      console.error('[Checkout] proceed exception:', err);
      await handleCheckout();
    }
  }

  const paymentLabels = { cash: 'Dinheiro', card: 'Cartão na Entrega', pix: 'PIX' };

  const subtotal = total;
  const deliveryAmount = orderType === 'delivery' ? deliveryFee : 0;
  const grandTotal = subtotal + deliveryAmount;

  const generateOrderId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  useEffect(() => {
    if (open && onOpen) onOpen();
  }, [open, onOpen]);

  const validateCheckoutForm = () => {
    const validationData = {
      name, phone, orderType, paymentMethod,
      ...(orderType === 'delivery' && { zipCode, street, number, neighborhood, complement, referencePoint }),
      ...(paymentMethod === 'cash' && { changeFor }),
    };
    if (orderType === 'delivery' && (!street.trim() || !number.trim() || !neighborhood.trim())) {
      setErrors({ address: 'Preencha rua, número e bairro para entrega' });
      return false;
    }
    const result = checkoutSchema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleCheckout = async () => {
    if (!validateCheckoutForm()) return;
    setSubmitting(true);

    try {
      // ===== Resolve store WhatsApp (with global fallback) =====
      let storePhoneDigits = (whatsapp || '').replace(/\D/g, '');
      if (!storePhoneDigits) {
        console.error('[Checkout] Store WhatsApp missing on props — trying global fallback.');
        try {
          const { data: fallback } = await supabase.rpc('get_global_setting', { setting_key: 'owner_whatsapp' });
          storePhoneDigits = (fallback || '').replace(/\D/g, '');
        } catch (e) {
          console.error('[Checkout] Failed to fetch global owner_whatsapp:', e);
        }
      }
      if (!storePhoneDigits) {
        console.error('[Checkout] No WhatsApp number available. Aborting.');
        setErrors({ submit: 'A loja ainda não configurou o WhatsApp para receber pedidos.' });
        setSubmitting(false);
        return;
      }

      let addressStr = '';
      if (orderType === 'delivery') {
        addressStr = `${street}, ${number}`;
        if (complement) addressStr += ` - ${complement}`;
        addressStr += `, ${neighborhood}`;
        if (zipCode) addressStr += ` - CEP: ${zipCode}`;
        if (referencePoint) addressStr += ` | Ref: ${referencePoint}`;
      }

      const orderId = generateOrderId();
      const phoneDigits = phone.replace(/\D/g, '');
      const orderItems: CheckoutOrderItem[] = items.map((item) => {
        const modifiers = (item.modifiers || []).map((m) => ({ id: m.id, name: m.name, price: m.price }));
        const modifiersTotal = modifiers.reduce((sum, m) => sum + m.price, 0);
        const lineTotal = (item.price + modifiersTotal) * item.quantity;
        return {
          id: item.id, name: item.name, quantity: item.quantity, unitPrice: item.price,
          lineTotal, modifiers, observation: item.observation || null,
        };
      });

      let savedOrderId = orderId;
      let sessionToken: string | null = null;

      // ===== Persist order — failures DO NOT block the redirect =====
      if (storeId) {
        try {
          const cartId = await saveImmediately();
          const { data: createdOrder, error: orderError } = await supabase.rpc('create_public_order', {
            p_order_id: orderId,
            p_store_id: storeId,
            p_customer_name: name,
            p_customer_phone: phoneDigits || phone,
            p_items: orderItems.map((item) => ({
              id: item.id, name: item.name, quantity: item.quantity,
              price: item.unitPrice, modifiers: item.modifiers, observation: item.observation,
            })) as unknown as import('@/integrations/supabase/types').Json,
            p_address: addressStr || null,
            p_payment_method: `whatsapp_${paymentMethod}`,
            p_client_total: grandTotal,
            p_cart_id: cartId || undefined,
          });
          if (orderError || !createdOrder?.[0]) {
            console.error('[Order] save failed, continuing to WhatsApp anyway:', orderError?.message);
          } else {
            savedOrderId = createdOrder[0].order_id;
            sessionToken = createdOrder[0].customer_session_token;
            try { await markAsConverted(savedOrderId); } catch (e) { console.warn('[Cart] markAsConverted failed:', e); }
          }
        } catch (err) {
          console.error('[Order] save exception, continuing to WhatsApp anyway:', err);
        }
      }

      // ===== Build message =====
      const shortId = savedOrderId.slice(0, 8).toUpperCase();
      const itemLines = orderItems
        .map((item) => {
          const modifierLines = item.modifiers.length > 0
            ? `\n${item.modifiers.map((m) => `   ↳ ${m.name} (+R$ ${m.price.toFixed(2).replace('.', ',')})`).join('\n')}`
            : '';
          const observationLine = item.observation ? `\n   📝 ${item.observation}` : '';
          return `• ${item.quantity}x ${item.name} — R$ ${item.lineTotal.toFixed(2).replace('.', ',')}${modifierLines}${observationLine}`;
        })
        .join('\n');

      const safeStoreName = storeName?.trim() || 'Restaurante';
      const divider = '---------------------------------';

      const deliveryMethodLabel = orderType === 'delivery' ? 'Entrega' : 'Retirada no local';
      let deliveryAddressLine = '—';
      if (orderType === 'delivery') {
        let addr = `${street}, ${number}`;
        if (complement) addr += ` - ${complement}`;
        if (neighborhood) addr += `, ${neighborhood}`;
        if (zipCode) addr += ` (CEP ${zipCode})`;
        if (referencePoint) addr += ` — Ref: ${referencePoint}`;
        deliveryAddressLine = addr;
      }
      const deliveryFeeText = orderType === 'delivery'
        ? deliveryAmount.toFixed(2).replace('.', ',')
        : '0,00';

      let paymentLine = paymentLabels[paymentMethod];
      if (paymentMethod === 'cash' && changeFor) paymentLine += ` (troco para R$ ${changeFor})`;
      if (paymentMethod === 'pix' && pixKey) paymentLine += ` — Chave: ${pixKey}`;

      let message = `*🍔 NOVO PEDIDO - ${safeStoreName}*\n\n`;
      message += `${divider}\n\n`;
      message += `*Pedido:* #${shortId}\n`;
      message += `*Cliente:* ${name}\n`;
      message += `*Telefone:* ${phoneDigits || phone}\n\n`;
      message += `*📌 ITENS DO PEDIDO:*\n${itemLines}\n\n`;
      message += `*🛵 ENTREGA:*\n`;
      message += `• Método: ${deliveryMethodLabel}\n`;
      message += `• Endereço: ${deliveryAddressLine}\n`;
      message += `• Taxa de Entrega: R$ ${deliveryFeeText}\n\n`;
      message += `*💰 PAGAMENTO:*\n`;
      message += `• Forma: ${paymentLine}\n`;
      message += `• *Total Geral: R$ ${grandTotal.toFixed(2).replace('.', ',')}*\n\n`;
      message += `${divider}\n\n`;
      message += `👉 _Pedido gerado por Sistema Delivery ADS_`;

      const encodedText = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${storePhoneDigits}?text=${encodedText}`;

      // ===== Reset UI then fire redirect =====
      onPurchase?.();
      clearCart();
      setSubmitting(false);
      setOpen(false);

      const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        console.warn('[Checkout] window.open blocked — navigating current tab.');
        window.location.href = whatsappUrl;
        return;
      }

      if (sessionToken) {
        const internalTrackingUrl = `/pedido/${savedOrderId}?token=${encodeURIComponent(sessionToken)}`;
        window.setTimeout(() => { window.location.assign(internalTrackingUrl); }, 200);
      }
    } catch (err) {
      console.error('[Checkout] fatal exception:', err);
      setErrors({ submit: 'Erro inesperado. Tente novamente.' });
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto">
          <div className="sm:hidden glass-card border-t border-border/50 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center relative">
                <ShoppingCart className="w-5 h-5 text-primary-foreground" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
                </p>
                {itemCount > 0 && (
                  <p className="text-primary font-semibold">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>
            </div>
            <Button className="btn-glow bg-primary text-primary-foreground px-6">Ver Carrinho</Button>
          </div>

          <Button
            size="lg"
            className="hidden sm:flex rounded-full w-16 h-16 btn-glow animate-pulse-glow bg-primary text-primary-foreground shadow-2xl"
          >
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </SheetTrigger>
      <SheetContent className="bg-card border-border w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Seu Carrinho
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
            <p>Seu carrinho está vazio</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              {items.map((item) => {
                const modifiersTotal = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
                const itemTotal = (item.price + modifiersTotal) * item.quantity;
                return (
                  <div key={item.cartKey} className="flex items-start gap-3 p-3 glass-card animate-fade-in">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.modifiers.map((m) => (
                            <span key={m.id} className="block">+ {m.name} (R$ {m.price.toFixed(2).replace('.', ',')})</span>
                          ))}
                        </div>
                      )}
                      {item.observation && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Obs: {item.observation}</p>
                      )}
                      <p className="text-primary font-semibold mt-1">R$ {itemTotal.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="w-8 h-8" onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="w-8 h-8" onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => removeItem(item.cartKey)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="name" className="text-foreground">Nome Completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => saveImmediately()} placeholder="Seu nome completo" className="mt-1 bg-secondary border-border" />
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-foreground">Telefone / WhatsApp</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => saveImmediately()} placeholder="(11) 99999-9999" className="mt-1 bg-secondary border-border" />
                  {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="p-4 glass-card rounded-lg">
                <Label className="text-foreground mb-3 block">Tipo de Pedido</Label>
                <div className="flex items-center gap-4">
                  <Button type="button" variant={orderType === 'delivery' ? 'default' : 'outline'} className={`flex-1 gap-2 ${orderType === 'delivery' ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setOrderType('delivery')}>
                    <Truck className="w-4 h-4" /> Entrega
                  </Button>
                  <Button type="button" variant={orderType === 'pickup' ? 'default' : 'outline'} className={`flex-1 gap-2 ${orderType === 'pickup' ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setOrderType('pickup')}>
                    <Store className="w-4 h-4" /> Retirada
                  </Button>
                </div>
              </div>

              {orderType === 'delivery' && (
                <div className="space-y-3 p-4 glass-card rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Label className="text-foreground font-medium">Endereço de Entrega</Label>
                  </div>
                  {errors.address && <p className="text-destructive text-sm">{errors.address}</p>}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="CEP" className="bg-secondary border-border" />
                    </div>
                    <div>
                      <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Nº" className="bg-secondary border-border" />
                    </div>
                  </div>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua / Avenida" className="bg-secondary border-border" />
                  <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Bairro" className="bg-secondary border-border" />
                  <Input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Complemento (apto, bloco...)" className="bg-secondary border-border" />
                  <Input value={referencePoint} onChange={(e) => setReferencePoint(e.target.value)} placeholder="Ponto de referência" className="bg-secondary border-border" />
                </div>
              )}

              <div>
                <Label className="text-foreground">Forma de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'cash' | 'card' | 'pix')} className="mt-2 space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="cursor-pointer flex-1">PIX</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="cursor-pointer flex-1">Cartão na Entrega</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer flex-1">Dinheiro</Label>
                  </div>
                </RadioGroup>
                {paymentMethod === 'cash' && (
                  <div className="mt-3">
                    <Label htmlFor="changeFor" className="text-foreground">Troco para quanto?</Label>
                    <Input id="changeFor" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder="Ex: 50,00" className="mt-1 bg-secondary border-border" />
                  </div>
                )}
              </div>

              <div className="py-4 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Taxa de Entrega</span>
                    <span>R$ {deliveryAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-lg font-medium text-foreground">Total</span>
                  <span className="text-2xl font-display text-primary">R$ {grandTotal.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {!isStoreOpen && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">A loja está fechada no momento. Não é possível finalizar pedidos.</p>
                </div>
              )}

              {errors.submit && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{errors.submit}</p>
                </div>
              )}

              <Button
                onClick={() => { hapticSuccess(); handleProceedToCheckout(); }}
                disabled={submitting || !isStoreOpen}
                className="w-full btn-glow bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg font-display disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {!isStoreOpen ? 'Loja Fechada' : 'Confirmar Pedido via WhatsApp'}
              </Button>
            </div>
          </div>
        )}

        {storeId && (
          <UpsellModal
            open={upsellOpen}
            onOpenChange={setUpsellOpen}
            storeId={storeId}
            onContinue={handleCheckout}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
