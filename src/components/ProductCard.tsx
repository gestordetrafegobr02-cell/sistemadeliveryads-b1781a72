import { useState, useEffect } from 'react';
import { Plus, ImageOff } from 'lucide-react';
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
      setModifierModalOpen(true);
    } else {
      addItem({ id, name, price, image_url });
    }
  };

  const showImage = image_url && !imgError;

  return (
    <>
      <div className="card-clean p-5 group">
        <div className="flex gap-5">
          {/* Image with 4:3 aspect ratio */}
          <div className="w-28 aspect-[4/3] rounded-xl overflow-hidden flex-shrink-0 bg-muted/50">
            {showImage ? (
              <img
                src={image_url}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60">
                <ImageOff className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-1">
                {name}
              </h3>
              {description && (
                <p className="text-muted-foreground text-sm mt-1.5 line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-foreground font-bold text-lg">
                R$ {price.toFixed(2).replace('.', ',')}
              </span>
              <button
                onClick={handleAdd}
                className="btn-minimal"
                aria-label="Adicionar ao carrinho"
              >
                <Plus className="w-5 h-5" />
              </button>
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
