import { useState } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/lib/cart';
import { z } from 'zod';

const checkoutSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  address: z.string().min(5, 'Endereço muito curto').max(300),
  paymentMethod: z.enum(['cash', 'card', 'pix']),
});

interface CartSheetProps {
  whatsapp?: string;
  onPurchase?: () => void;
}

export function CartSheet({ whatsapp, onPurchase }: CartSheetProps) {
  const { items, updateQuantity, removeItem, total, itemCount, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('pix');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentLabels = {
    cash: 'Dinheiro',
    card: 'Cartão na Entrega',
    pix: 'PIX',
  };

  const handleCheckout = () => {
    const result = checkoutSchema.safeParse({ name, address, paymentMethod });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const itemsList = items
      .map((item) => `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`)
      .join('\n');

    const message = `🍔 *NOVO PEDIDO*\n\n` +
      `*Cliente:* ${name}\n\n` +
      `*Itens:*\n${itemsList}\n\n` +
      `*Total:* R$ ${total.toFixed(2).replace('.', ',')}\n\n` +
      `*Endereço:* ${address}\n\n` +
      `*Pagamento:* ${paymentLabels[paymentMethod]}`;

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = whatsapp?.replace(/\D/g, '') || '';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    onPurchase?.();
    clearCart();
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

            {/* Total */}
            <div className="flex items-center justify-between py-4 border-t border-border">
              <span className="text-lg font-medium text-foreground">Total</span>
              <span className="text-2xl font-display text-primary">
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Checkout Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-foreground">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 bg-secondary border-border"
                />
                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="address" className="text-foreground">Endereço de Entrega</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="mt-1 bg-secondary border-border"
                />
                {errors.address && <p className="text-destructive text-sm mt-1">{errors.address}</p>}
              </div>

              <div>
                <Label className="text-foreground">Forma de Pagamento</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'cash' | 'card' | 'pix')}
                  className="mt-2 space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="cursor-pointer">PIX</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="cursor-pointer">Cartão na Entrega</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer">Dinheiro</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full btn-glow bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg font-display"
              >
                Confirmar Pedido via WhatsApp
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
