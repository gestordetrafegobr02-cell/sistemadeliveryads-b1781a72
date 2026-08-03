import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, ImageOff } from 'lucide-react';
import { useCart, CartItemModifier } from '@/lib/cart';
import { hapticClick } from '@/lib/haptics';
import { toast } from 'sonner';

interface Modifier {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  group_name: string | null;
  group_max: number | null;
  group_min: number | null;
  is_default: boolean | null;
  group_sort: number | null;
  sort_order: number | null;
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

const db = supabase as any;

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
    const { data } = await db
      .from('product_modifiers')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_available', true)
      .order('group_sort', { ascending: true, nullsFirst: false })
      .order('sort_order', { ascending: true });

    const list = (data as Modifier[]) || [];
    setModifiers(list);
    // Pre-select items that already come included with the product
    setSelectedModifiers(new Set(list.filter((m) => m.is_default).map((m) => m.id)));
    setLoading(false);
  }

  // Group modifiers by group_name (nulls go to "Adicionais")
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { name: string; max: number | null; min: number; items: Modifier[]; order: number }
    >();
    modifiers.forEach((m, i) => {
      const key = m.group_name?.trim() || 'Adicionais';
      const existing = map.get(key);
      if (existing) {
        existing.items.push(m);
        if (m.group_max != null && (existing.max == null || m.group_max < existing.max)) {
          existing.max = m.group_max;
        }
        if ((m.group_min ?? 0) > existing.min) existing.min = m.group_min ?? 0;
      } else {
        map.set(key, {
          name: key,
          max: m.group_max ?? null,
          min: m.group_min ?? 0,
          items: [m],
          order: m.group_sort ?? i,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [modifiers]);

  function countSelectedInGroup(items: Modifier[]) {
    return items.filter((m) => selectedModifiers.has(m.id)).length;
  }

  function toggleModifier(m: Modifier, groupItems: Modifier[], max: number | null) {
    setSelectedModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) {
        next.delete(m.id);
      } else {
        if (max === 1) {
          // Single-choice group: replace current selection
          groupItems.forEach((it) => next.delete(it.id));
        } else if (max != null) {
          const currentCount = groupItems.filter((it) => next.has(it.id)).length;
          if (currentCount >= max) {
            toast.error(`Máximo de ${max} item${max > 1 ? 's' : ''} neste grupo`);
            return prev;
          }
        }
        next.add(m.id);
      }
      return next;
    });
  }

  const selectedModifiersList = modifiers.filter((m) => selectedModifiers.has(m.id));
  const modifiersTotal = selectedModifiersList.reduce((sum, m) => sum + Number(m.price), 0);
  const totalPrice = product.price + modifiersTotal;

  // Included items the customer removed → informed to the store
  const removedDefaults = modifiers.filter((m) => m.is_default && !selectedModifiers.has(m.id));

  const missingGroup = groups.find((g) => g.min > 0 && countSelectedInGroup(g.items) < g.min);

  function handleAddToCart() {
    if (missingGroup) {
      toast.error(
        `Escolha ${missingGroup.min > 1 ? `${missingGroup.min} opções` : '1 opção'} em "${missingGroup.name}"`
      );
      return;
    }
    hapticClick();
    const cartModifiers: CartItemModifier[] = selectedModifiersList.map((m) => ({
      id: m.id,
      name: m.name,
      price: Number(m.price),
    }));
    const removalNote = removedDefaults.length
      ? `Sem ${removedDefaults.map((m) => m.name).join(', sem ')}`
      : '';
    const note = [removalNote, observation.trim()].filter(Boolean).join(' • ');
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      modifiers: cartModifiers.length > 0 ? cartModifiers : undefined,
      observation: note || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
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

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : groups.length > 0 ? (
            <div className="space-y-5">
              {groups.map((group) => {
                const count = countSelectedInGroup(group.items);
                const required = group.min > 0;
                const incomplete = required && count < group.min;
                return (
                  <div key={group.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground font-semibold text-base">
                          {group.name}
                          {required && (
                            <span
                              className={`ml-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                incomplete
                                  ? 'bg-destructive/15 text-destructive'
                                  : 'bg-emerald/15 text-emerald'
                              }`}
                            >
                              Obrigatório
                            </span>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {required
                            ? group.max === 1 || group.min === 1
                              ? 'Escolha 1 opção'
                              : `Escolha ao menos ${group.min} opções`
                            : group.max != null
                              ? `Escolha até ${group.max} ${group.max > 1 ? 'itens' : 'item'}`
                              : 'Opcional'}
                        </p>
                      </div>
                      {group.max != null && (
                        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                          {count}/{group.max}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {group.items.map((modifier) => {
                        const isSelected = selectedModifiers.has(modifier.id);
                        const disabled =
                          !isSelected &&
                          group.max != null &&
                          group.max !== 1 &&
                          count >= group.max;
                        return (
                          <div
                            key={modifier.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : disabled
                                  ? 'border-border bg-secondary/50 opacity-50 cursor-not-allowed'
                                  : 'border-border bg-secondary hover:border-primary/50 cursor-pointer'
                            }`}
                            onClick={() => !disabled && toggleModifier(modifier, group.items, group.max)}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                disabled={disabled}
                                onCheckedChange={() => !disabled && toggleModifier(modifier, group.items, group.max)}
                              />
                              <span className="font-medium">{modifier.name}</span>
                            </div>
                            {Number(modifier.price) > 0 ? (
                              <span className="text-primary font-semibold">
                                + R$ {Number(modifier.price).toFixed(2).replace('.', ',')}
                              </span>
                            ) : modifier.is_default ? (
                              <span className="text-xs text-emerald font-medium">
                                {isSelected ? 'Incluso' : 'Removido'}
                              </span>
                            ) : (
                              <span className="text-xs text-emerald font-medium">Grátis</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {removedDefaults.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Sem: {removedDefaults.map((m) => m.name).join(', ')}
            </p>
          )}

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Observações (opcional)</Label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: capricha na calda, sem gelo..."
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
            disabled={!!missingGroup}
            className="btn-glow bg-primary text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            {missingGroup ? 'Escolha as opções' : 'Adicionar ao Carrinho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
