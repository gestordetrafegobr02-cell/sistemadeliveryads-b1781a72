import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ImageOff, Check } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useCart } from '@/lib/cart';
import { hapticClick } from '@/lib/haptics';
import { ProductModifierSelect } from './ProductModifierSelect';
import type { GroupedProductEntry, ProductVariant } from '@/lib/productGrouping';

interface Props {
  group: GroupedProductEntry;
}


function formatBRL(n: number) {
  return `R$ ${n.toFixed(2).replace('.', ',')}`;
}

function GroupedProductCardImpl({ group }: Props) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [modifierModalOpen, setModifierModalOpen] = useState(false);

  const showImage = group.image_url && !imgError;

  const handleSelectVariant = (variant: ProductVariant) => {
    hapticClick();
    setSelectedVariant(variant);
    setModifierModalOpen(true);
  };

  const onAddComplete = (variantId: string) => {
    setJustAddedId(variantId);
    setTimeout(() => {
      setJustAddedId(null);
      setOpen(false);
    }, 700);
  };

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          hapticClick();
          setOpen(true);
        }}
        className="text-left bg-card rounded-3xl overflow-hidden transition-all duration-300 w-full"
        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}
        aria-label={`Escolher tamanho de ${group.baseName}`}
      >
        {showImage ? (
          <div className="rel...[truncated]