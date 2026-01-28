import { useState, useEffect } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, MapPin, Truck, Store, Loader2, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/lib/cart';
import { supabase } from '@/integrations/supabase/client';
import { hapticClick, hapticSuccess } from '@/lib/haptics';
import { z } from 'zod';
import { UpsellModal } from './UpsellModal';

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
  whatsapp?: string;
  deliveryFee?: number;
  pixKey?: string;
  onPurchase?: () => void;
  onOpen?: () => void;
  isStoreOpen?: boolean;
}

interface StoreUpsellConfig {
  upsell_enabled: boolean;
  upsell_blocking_categories: string[];
}

export function CartSheet({ storeId, whatsapp, deliveryFee = 0, pixKey, onPurchase, onOpen, isStoreOpen = true }: CartSheetProps) {
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

  // Fetch upsell config when store loads
  useEffect(() => {
    async function fetchUpsellConfig() {
      if (!storeId) return;
      
      const { data: storeData } = await supabase
        .from('stores')
        .select('upsell_enabled')
        .eq('id', storeId)
        .single();
      
      if (storeData) {
        setUpsellConfig({
          upsell_enabled: storeData.upsell_enabled ?? false,
          upsell_blocking_categories: [], // Not needed anymore, RPC handles it
        });
      }
    }
    fetchUpsellConfig();
  }, [storeId]);

  // Smart upsell check: returns true if upsell should be shown
  async function shouldShowUpsell(): Promise<boolean> {
    // Basic checks
    if (!upsellConfig?.upsell_enabled) return false;
    if (!storeId || items.length === 0) return false;

    const productIds = items.map((item) => item.id);

    // Use the RPC function which already handles all the logic
    // (blocking categories, exceptions, and finding available products)
    const { data: upsellProducts, error } = await supabase
      .rpc('get_personalized_upsell', { 
        p_store_id: storeId, 
        p_cart_product_ids: productIds,
        p_limit: 3 
      });

    if (error) {
      console.error('Error checking upsell:', error);
      return false;
    }

    // Show upsell modal only if there are products to suggest
    return upsellProducts && upsellProducts.length > 0;
  }

  async function handleProceedToCheckout() {
    const showUpsell = await shouldShowUpsell();
    if (showUpsell) {
      setUpsellOpen(true);
    } else {
      handleCheckout();
    }
  }

  const paymentLabels = {
    cash: 'Dinheiro',
    card: 'Cartão na Entrega',
    pix: 'PIX',
  };

  // Calculate totals
  const subtotal = total;
  const deliveryAmount = orderType === 'delivery' ? deliveryFee : 0;
  const grandTotal = subtotal + deliveryAmount;

  // Generate order ID
  const generateOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${timestamp}-${random}`;
  };

  useEffect(() => {
    if (open && onOpen) {
      onOpen();
    }
  }, [open, onOpen]);

  const handleCheckout = async () => {
    // Build validation schema dynamically based on order type
    const validationData = {
      name,
      phone,
      orderType,
      paymentMethod,
      ...(orderType === 'delivery' && {
        zipCode,
        street,
        number,
        neighborhood,
        complement,
        referencePoint,
      }),
      ...(paymentMethod === 'cash' && { changeFor }),
    };

    // Validate required delivery fields
    if (orderType === 'delivery') {
      if (!street.trim() || !number.trim() || !neighborhood.trim()) {
        setErrors({
          address: 'Preencha rua, número e bairro para entrega',
        });
        return;
      }
    }

    const result = checkoutSchema.safeParse(validationData);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    // Build address string
    let addressStr = '';
    if (orderType === 'delivery') {
      addressStr = `${street}, ${number}`;
      if (complement) addressStr += ` - ${complement}`;
      addressStr += `, ${neighborhood}`;
      if (zipCode) addressStr += ` - CEP: ${zipCode}`;
      if (referencePoint) addressStr += ` | Ref: ${referencePoint}`;
    }

    // Save order to database
    if (storeId) {
      try {
        const orderItems = items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers || [],
          observation: item.observation || null,
        }));

        const { error: orderError } = await supabase.from('orders').insert([{
          store_id: storeId,
          customer_name: name,
          customer_phone: phone,
          items: orderItems as unknown as import('@/integrations/supabase/types').Json,
          total: grandTotal,
          address: addressStr || null,
          payment_method: paymentMethod,
        }]);

        if (orderError) {
          console.error('Order save error:', orderError.message);
          // Continue to WhatsApp even if DB fails
        } else {
          console.log('Order saved successfully');
        }
      } catch (err) {
        console.error('Order save exception:', err);
        // Continue to WhatsApp even if DB fails
      }
    }

    const orderId = generateOrderId();

    // Build items list with modifiers and observations
    const itemsList = items
      .map((item) => {
        const modifiersTotal = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
        const itemTotal = (item.price + modifiersTotal) * item.quantity;
        
        let itemText = `• ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2).replace('.', ',')}`;
        
        if (item.modifiers && item.modifiers.length > 0) {
          const modifiersList = item.modifiers.map((m) => `  ↳ ${m.name} (+R$ ${m.price.toFixed(2).replace('.', ',')})`).join('\n');
          itemText += `\n${modifiersList}`;
        }
        
        if (item.observation) {
          itemText += `\n  📝 ${item.observation}`;
        }
        
        return itemText;
      })
      .join('\n');

    let message = `🛵 *PEDIDO #${orderId}*\n\n`;
    message += `*Cliente:* ${name}\n`;
    message += `*Telefone:* ${phone}\n\n`;
    message += `*Tipo:* ${orderType === 'delivery' ? '🚚 Entrega' : '🏪 Retirada na Loja'}\n\n`;
    message += `*Itens:*\n${itemsList}\n\n`;
    message += `*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    
    if (orderType === 'delivery') {
      message += `*Taxa de Entrega:* R$ ${deliveryAmount.toFixed(2).replace('.', ',')}\n`;
    }
    
    message += `*TOTAL:* R$ ${grandTotal.toFixed(2).replace('.', ',')}\n\n`;
    message += `*Pagamento:* ${paymentLabels[paymentMethod]}`;
    
    if (paymentMethod === 'cash' && changeFor) {
      message += ` (Troco para R$ ${changeFor})`;
    }
    
    if (paymentMethod === 'pix' && pixKey) {
      message += `\n*Chave PIX:* ${pixKey}`;
    }

    if (orderType === 'delivery') {
      message += `\n\n*📍 Endereço de Entrega:*\n`;
      message += `${street}, ${number}`;
      if (complement) message += ` - ${complement}`;
      message += `\n${neighborhood}`;
      if (zipCode) message += ` - CEP: ${zipCode}`;
      if (referencePoint) message += `\n*Ponto de Ref:* ${referencePoint}`;
    }

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = whatsapp?.replace(/\D/g, '') || '';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    onPurchase?.();
    clearCart();
    setSubmitting(false);
    setOpen(false);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* Mobile: Fixed bottom bar, Desktop: Floating button */}
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto">
          {/* Mobile bottom bar */}
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
            <Button className="btn-glow bg-primary text-primary-foreground px-6">
              Ver Carrinho
            </Button>
          </div>

          {/* Desktop floating button */}
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
            {/* Cart Items */}
            <div className="space-y-4">
              {items.map((item) => {
                const modifiersTotal = item.modifiers?.reduce((sum, m) => sum + m.price, 0) || 0;
                const itemTotal = (item.price + modifiersTotal) * item.quantity;
                
                return (
                  <div
                    key={item.cartKey}
                    className="flex items-start gap-3 p-3 glass-card animate-fade-in"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                      {/* Show modifiers */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.modifiers.map((m) => (
                            <span key={m.id} className="block">
                              + {m.name} (R$ {m.price.toFixed(2).replace('.', ',')})
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Show observation */}
                      {item.observation && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Obs: {item.observation}
                        </p>
                      )}
                      <p className="text-primary font-semibold mt-1">
                        R$ {itemTotal.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-8 h-8"
                        onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-8 h-8"
                        onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.cartKey)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checkout Form */}
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="name" className="text-foreground">Nome Completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="mt-1 bg-secondary border-border"
                  />
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-foreground">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1 bg-secondary border-border"
                  />
                  {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Order Type Toggle */}
              <div className="p-4 glass-card rounded-lg">
                <Label className="text-foreground mb-3 block">Tipo de Pedido</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant={orderType === 'delivery' ? 'default' : 'outline'}
                    className={`flex-1 gap-2 ${orderType === 'delivery' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setOrderType('delivery')}
                  >
                    <Truck className="w-4 h-4" />
                    Entrega
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === 'pickup' ? 'default' : 'outline'}
                    className={`flex-1 gap-2 ${orderType === 'pickup' ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => setOrderType('pickup')}
                  >
                    <Store className="w-4 h-4" />
                    Retirada
                  </Button>
                </div>
              </div>

              {/* Address Fields - Only show for delivery */}
              {orderType === 'delivery' && (
                <div className="space-y-3 p-4 glass-card rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <Label className="text-foreground font-medium">Endereço de Entrega</Label>
                  </div>
                  
                  {errors.address && <p className="text-destructive text-sm">{errors.address}</p>}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        placeholder="CEP"
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div>
                      <Input
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="Nº"
                        className="bg-secondary border-border"
                      />
                    </div>
                  </div>

                  <Input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Rua / Avenida"
                    className="bg-secondary border-border"
                  />

                  <Input
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bairro"
                    className="bg-secondary border-border"
                  />

                  <Input
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Complemento (apto, bloco...)"
                    className="bg-secondary border-border"
                  />

                  <Input
                    value={referencePoint}
                    onChange={(e) => setReferencePoint(e.target.value)}
                    placeholder="Ponto de referência"
                    className="bg-secondary border-border"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <Label className="text-foreground">Forma de Pagamento</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'cash' | 'card' | 'pix')}
                  className="mt-2 space-y-2"
                >
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

                {/* Change For - Only show for cash */}
                {paymentMethod === 'cash' && (
                  <div className="mt-3">
                    <Label htmlFor="changeFor" className="text-foreground">Troco para quanto?</Label>
                    <Input
                      id="changeFor"
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                      placeholder="Ex: 50,00"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>
                )}
              </div>

              {/* Totals */}
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
                  <span className="text-2xl font-display text-primary">
                    R$ {grandTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {!isStoreOpen && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">
                    A loja está fechada no momento. Não é possível finalizar pedidos.
                  </p>
                </div>
              )}

              <Button
                onClick={() => {
                  hapticSuccess();
                  handleProceedToCheckout();
                }}
                disabled={submitting || !isStoreOpen}
                className="w-full btn-glow bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg font-display disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isStoreOpen ? 'Confirmar Pedido via WhatsApp' : 'Loja Fechada'}
              </Button>
            </div>
          </div>
        )}

        {/* Upsell Modal */}
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
