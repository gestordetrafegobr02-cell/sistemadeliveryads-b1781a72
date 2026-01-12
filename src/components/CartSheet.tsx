import { useState, useEffect } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, MapPin, Truck, Store, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useCart } from '@/lib/cart';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

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
}

export function CartSheet({ storeId, whatsapp, deliveryFee = 0, pixKey, onPurchase, onOpen }: CartSheetProps) {
  const { items, updateQuantity, removeItem, total, itemCount, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
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
      const orderItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      await supabase.from('orders').insert({
        store_id: storeId,
        customer_name: name,
        customer_phone: phone,
        items: orderItems,
        total: grandTotal,
        address: addressStr || null,
        payment_method: paymentMethod,
        status: 'pending',
      });
    }

    const orderId = generateOrderId();

    const itemsList = items
      .map((item) => `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`)
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
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 rounded-full w-16 h-16 btn-glow animate-pulse-glow bg-primary text-primary-foreground shadow-2xl"
        >
          <ShoppingCart className="w-6 h-6" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
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
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 glass-card animate-fade-in"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{item.name}</h4>
                    <p className="text-primary font-semibold">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-8 h-8"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-6 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-8 h-8"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
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

              <Button
                onClick={handleCheckout}
                disabled={submitting}
                className="w-full btn-glow bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg font-display"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Confirmar Pedido via WhatsApp
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
