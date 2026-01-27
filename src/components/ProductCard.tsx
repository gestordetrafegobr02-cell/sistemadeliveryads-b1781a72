import { useState, useEffect } from 'react';
import { Plus, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart';
import { hapticClick } from '@/lib/haptics';
import { supabase } from '@/integrations/supabase/client';
import { ProductModifierSelect } from './ProductModifierSelect';

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}

export function ProductCard({ id, name, description, price, image_url }: ProductCardProps) {
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const [hasModifiers, setHasModifiers] = useState(false);
  const [modifierModalOpen, setModifierModalOpen] = useState(false);

  // Check if product has modifiers
  useEffect(() => {
    async function checkModifiers() {
      const { count } = await supabase
        .from('product_modifiers')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
        .eq('is_available', true);
      
      setHasModifiers((count || 0) > 0);
    }
    checkModifiers();
  }, [id]);

  const handleAdd = () => {
    hapticClick();
    
    if (hasModifiers) {
      // Open modifier selection modal
      setModifierModalOpen(true);
    } else {
      // Add directly to cart
      addItem({ id, name, price, image_url });
    }
  };

  const showImage = image_url && !imgError;

  return (
    <>
      <div className="glass-card p-4 group hover:border-primary/40 transition-colors duration-200">
        <div className="flex gap-4">
          {/* Image or placeholder */}
          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-secondary flex items-center justify-center">
            {showImage ? (
              <img
                src={image_url}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <ImageOff className="w-6 h-6 mb-1" />
                <span className="text-[10px] text-center px-1 leading-tight truncate max-w-full">
                  {name.slice(0, 12)}
                </span>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl text-foreground truncate">{name}</h3>
            {description && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{description}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <span className="text-primary font-semibold text-lg">
                R$ {price.toFixed(2).replace('.', ',')}
              </span>
              <Button
                size="sm"
                onClick={handleAdd}
                className="btn-glow bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modifier selection modal */}
      <ProductModifierSelect
        open={modifierModalOpen}
        onOpenChange={setModifierModalOpen}
        product={{ id, name, price, description, image_url }}
      />
    </>
  );
}
