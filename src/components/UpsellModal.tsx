import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/lib/cart';
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UpsellProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category_name: string;
}

interface UpsellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onContinue: () => void;
}

export function UpsellModal({ open, onOpenChange, storeId, onContinue }: UpsellModalProps) {
  const [products, setProducts] = useState<UpsellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    if (open && storeId) {
      fetchUpsellProducts();
    }
  }, [open, storeId]);

  async function fetchUpsellProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_upsell_products', { p_store_id: storeId, p_limit: 3 });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching upsell products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddProduct(product: UpsellProduct) {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url || undefined,
    });
    toast.success(`${product.name} adicionado!`);
  }

  function handleAddAndContinue(product: UpsellProduct) {
    handleAddProduct(product);
    onOpenChange(false);
    onContinue();
  }

  function handleSkip() {
    onOpenChange(false);
    onContinue();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            🥤 Que tal uma bebida?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Complete seu pedido com uma bebida geladinha!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Sem sugestões disponíveis no momento.
            </p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">{product.category_name}</p>
                    <p className="text-primary font-semibold">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 gap-1"
                    onClick={() => handleAddAndContinue(product)}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {products.length > 0 && (
            <Button onClick={() => {
              products.forEach(p => handleAddProduct(p));
              onOpenChange(false);
              onContinue();
            }} className="w-full gap-2">
              Adicionar Todas e Continuar
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full text-muted-foreground"
          >
            Não, obrigado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
