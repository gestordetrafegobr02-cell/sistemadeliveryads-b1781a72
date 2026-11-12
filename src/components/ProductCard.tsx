import { memo, useState, useEffect } from 'react';
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
  /** When provided, skips the per-card modifier lookup (parent has already batched it). */
  hasModifiers?: boolean;
  has_free_addons?: boolean;
  free_addons_limit?: number;
}


function ProductCardImpl({ id, name, description, price, image_url, hasModifiers: hasModifiersProp, has_free_addons, free_addons_limit }: ProductCardProps) {
  const { addItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const [hasModifiers, setHasModifiers] = useState(hasModifiersProp ?? false);
  const [modifierModalOpen, setModifierModalOpen] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    // Parent already told us — skip the network call entirely.
    if (hasModifiersProp !== undefined) {
      setHasModifiers(hasModifiersProp);
      return;
    }
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('product_modifiers')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id)
        .eq('is_available', true);
      if (!cancelled) setHasModifiers((count || 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [id, hasModifiersProp]);

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
 ...[truncated]