import { useState, useEffect } from 'react';
import { Plus, Check, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [added, setAdded] = useState(false);

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
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  const showImage = image_url && !imgError;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-card rounded-3xl overflow-hidden transition-all duration-300"
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
      >
        {/* Large image on top */}
        {showImage ? (
          <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted/30">
            <img
              src={image_url}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-full aspect-[16/10] bg-muted/20 flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Product info */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-1">
            {name}
          </h3>
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-emerald font-bold text-lg">
              R$ {price.toFixed(2).replace('.', ',')}
            </span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleAdd}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                added
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
              aria-label="Adicionar ao carrinho"
            >
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="plus"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Plus className="w-5 h-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <ProductModifierSelect
        open={modifierModalOpen}
        onOpenChange={setModifierModalOpen}
        product={{ id, name, price, description, image_url }}
      />
    </>
  );
}
