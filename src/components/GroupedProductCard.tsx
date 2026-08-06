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
          <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted/30">
            <img
              src={group.image_url!}
              alt={group.baseName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
            <span className="absolute top-2 right-2 bg-primary/95 text-primary-foreground text-[11px] font-semibold px-2 py-1 rounded-full shadow">
              {group.variants.length} tamanhos
            </span>
          </div>
        ) : (
          <div className="w-full aspect-[16/10] bg-muted/20 flex items-center justify-center relative">
            <ImageOff className="w-8 h-8 text-muted-foreground/40" />
            <span className="absolute top-2 right-2 bg-primary/95 text-primary-foreground text-[11px] font-semibold px-2 py-1 rounded-full shadow">
              {group.variants.length} tamanhos
            </span>
          </div>
        )}

        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2">
            {group.baseName}
          </h3>
          {group.description && (
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {group.description}
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                a partir de
              </span>
              <span className="text-emerald font-bold text-lg leading-none">
                {formatBRL(group.minPrice)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </motion.button>

      {selectedVariant && (
        <ProductModifierSelect
          open={modifierModalOpen}
          onOpenChange={(isOpen) => {
            setModifierModalOpen(isOpen);
            if (!isOpen) onAddComplete(selectedVariant.id);
          }}
          product={{
            id: selectedVariant.id,
            name: `${group.baseName} ${selectedVariant.sizeLabel}`,
            price: selectedVariant.price,
            description: selectedVariant.description ?? undefined,
            image_url: selectedVariant.image_url ?? undefined,
            has_addons: selectedVariant.has_addons !== false,
            has_free_addons: selectedVariant.has_free_addons ?? false,
            free_addons_limit: selectedVariant.free_addons_limit ?? 0
          }}
        />
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl font-display">{group.baseName}</DrawerTitle>
            <DrawerDescription>
              {group.description || 'Escolha o tamanho para adicionar ao carrinho.'}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-2 overflow-y-auto">
            {group.variants.map((v) => {
              const added = justAddedId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectVariant(v)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    added
                      ? 'border-emerald bg-emerald/10'
                      : 'border-border bg-card hover:border-primary/50 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      added ? 'bg-emerald text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {added ? <Check className="w-5 h-5" /> : v.sizeLabel.replace(/[a-z]/gi, '').trim() || '•'}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-foreground">{v.sizeLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        {added ? 'Adicionado ao carrinho' : 'Toque para adicionar'}
                      </div>
                    </div>
                  </div>
                  <div className="text-emerald font-bold text-lg">
                    {formatBRL(v.price)}
                  </div>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export const GroupedProductCard = memo(GroupedProductCardImpl);
