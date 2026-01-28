import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/lib/cart';
import { Plus, Loader2, Sparkles, PartyPopper } from 'lucide-react';
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
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const { addItem } = useCart();

  useEffect(() => {
    if (open && storeId) {
      fetchUpsellProducts();
      setAddedProducts(new Set());
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
    setAddedProducts((prev) => new Set([...prev, product.id]));
    toast.success(`${product.name} adicionado!`, {
      icon: <Plus className="w-4 h-4" />,
    });
  }

  function handleContinue() {
    onOpenChange(false);
    onContinue();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-card to-secondary/30 border-primary/20 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <DialogHeader className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/20 animate-pulse">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-display text-center">
            Complete sua experiência! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Que tal adicionar uma bebida geladinha ao seu pedido?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-6">
              <PartyPopper className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Sem sugestões disponíveis no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const isAdded = addedProducts.has(product.id);
                
                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                      isAdded 
                        ? 'bg-primary/20 border border-primary/30 scale-[0.98]' 
                        : 'bg-secondary/60 hover:bg-secondary/90 border border-transparent'
                    }`}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{product.name}</h4>
                      <p className="text-xs text-muted-foreground">{product.category_name}</p>
                      <p className="text-primary font-bold text-lg">
                        R$ {product.price.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isAdded ? 'secondary' : 'default'}
                      className={`flex-shrink-0 gap-1 transition-all ${
                        isAdded 
                          ? 'bg-primary/20 text-primary pointer-events-none' 
                          : 'btn-glow'
                      }`}
                      onClick={() => handleAddProduct(product)}
                      disabled={isAdded}
                    >
                      {isAdded ? (
                        <>✓ Adicionado</>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Quero!
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 relative z-10">
          <Button 
            onClick={handleContinue} 
            className="w-full btn-glow text-lg py-6"
            size="lg"
          >
            {addedProducts.size > 0 ? (
              <>
                <PartyPopper className="w-5 h-5 mr-2" />
                Continuar com {addedProducts.size} {addedProducts.size === 1 ? 'item' : 'itens'}
              </>
            ) : (
              'Ir para o Checkout'
            )}
          </Button>
          {addedProducts.size === 0 && (
            <Button
              variant="ghost"
              onClick={handleContinue}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Não, obrigado
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
