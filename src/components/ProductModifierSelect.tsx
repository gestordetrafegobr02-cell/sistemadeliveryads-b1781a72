import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, ImageOff } from 'lucide-react';
import { useCart, CartItemModifier } from '@/lib/cart';
import { hapticClick } from '@/lib/haptics';

interface Modifier {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface ProductModifierSelectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
    description?: string;
    image_url?: string;
  };
}

export function ProductModifierSelect({ open, onOpenChange, product }: ProductModifierSelectProps) {
  const { addItem } = useCart();
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [observation, setObservation] = useState('');

  useEffect(() => {
    if (open) {
      fetchModifiers();
      setSelectedModifiers(new Set());
      setObservation('');
    }
  }, [open, product.id]);

  async function fetchModifiers() {
    setLoading(true);
    const { data } = await supabase
      .from('product_modifiers')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_available', true)
      .order('sort_order');

    setModifiers(data || []);
    setLoading(false);
  }

  function toggleModifier(id: string) {
    setSelectedModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Calculate total price
  const selectedModifiersList = modifiers.filter((m) => selectedModifiers.has(m.id));
  const modifiersTotal = selectedModifiersList.reduce((sum, m) => sum + m.price, 0);
  const totalPrice = product.price + modifiersTotal;

  function handleAddToCart() {
    hapticClick();
    
    const cartModifiers: CartItemModifier[] = selectedModifiersList.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
    }));

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      modifiers: cartModifiers.length > 0 ? cartModifiers : undefined,
      observation: observation.trim() || undefined,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product info */}
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageOff className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              {product.description && (
                <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
              )}
              <p className="text-lg font-semibold text-primary">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {/* Modifiers section */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : modifiers.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-foreground font-medium">Adicionais</Label>
              <div className="space-y-2">
                {modifiers.map((modifier) => (
                  <div
                    key={modifier.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedModifiers.has(modifier.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-secondary hover:border-primary/50'
                    }`}
                    onClick={() => toggleModifier(modifier.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedModifiers.has(modifier.id)}
                        onCheckedChange={() => toggleModifier(modifier.id)}
                      />
                      <span className="font-medium">{modifier.name}</span>
                    </div>
                    <span className="text-primary font-semibold">
                      + R$ {Number(modifier.price).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Observation field */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Observações (opcional)</Label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Sem cebola, ponto da carne bem passado..."
              className="w-full p-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">Total do item</p>
            <p className="text-xl font-bold text-primary">
              R$ {totalPrice.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <Button
            onClick={handleAddToCart}
            className="btn-glow bg-primary text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar ao Carrinho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
