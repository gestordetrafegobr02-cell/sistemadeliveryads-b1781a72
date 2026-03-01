import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface StockImage {
  url: string;
  alt: string;
}

interface GalleryCategory {
  name: string;
  images: StockImage[];
}

const GALLERY: GalleryCategory[] = [
  {
    name: 'Pizzas',
    images: [
      { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80', alt: 'Pizza margherita' },
      { url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80', alt: 'Pizza pepperoni' },
      { url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80', alt: 'Pizza fatia' },
      { url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&q=80', alt: 'Pizza calabresa' },
      { url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80', alt: 'Pizza portuguesa' },
      { url: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80', alt: 'Pizza quatro queijos' },
    ],
  },
  {
    name: 'Hambúrgueres',
    images: [
      { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', alt: 'Hambúrguer clássico' },
      { url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80', alt: 'Hambúrguer duplo' },
      { url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80', alt: 'Hambúrguer artesanal' },
      { url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&q=80', alt: 'Hambúrguer bacon' },
      { url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80', alt: 'Hambúrguer gourmet' },
      { url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80', alt: 'Hambúrguer smash' },
    ],
  },
  {
    name: 'Açaí',
    images: [
      { url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&q=80', alt: 'Açaí bowl' },
      { url: 'https://images.unsplash.com/photo-1615478503562-ec2d8aa0a24b?w=600&q=80', alt: 'Açaí com frutas' },
      { url: 'https://images.unsplash.com/photo-1501959915551-4e8d30928317?w=600&q=80', alt: 'Smoothie bowl açaí' },
      { url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&q=80', alt: 'Açaí copo' },
      { url: 'https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=600&q=80', alt: 'Açaí com granola' },
      { url: 'https://images.unsplash.com/photo-1557800636-894a64c1696f?w=600&q=80', alt: 'Frutas tropicais' },
    ],
  },
  {
    name: 'Bebidas',
    images: [
      { url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80', alt: 'Suco natural' },
      { url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80', alt: 'Drink refrescante' },
      { url: 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=600&q=80', alt: 'Milkshake' },
      { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80', alt: 'Café' },
      { url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80', alt: 'Refrigerante' },
      { url: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=600&q=80', alt: 'Água de coco' },
    ],
  },
  {
    name: 'Porções',
    images: [
      { url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&q=80', alt: 'Batata frita' },
      { url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80', alt: 'Onion rings' },
      { url: 'https://images.unsplash.com/photo-1585325701956-60dd9c8553bc?w=600&q=80', alt: 'Nuggets' },
      { url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80', alt: 'Frango frito' },
      { url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&q=80', alt: 'Petiscos' },
      { url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80', alt: 'Nachos' },
    ],
  },
  {
    name: 'Sobremesas',
    images: [
      { url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80', alt: 'Donuts' },
      { url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80', alt: 'Bolo de chocolate' },
      { url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80', alt: 'Pudim' },
      { url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80', alt: 'Sorvete' },
      { url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80', alt: 'Brownie' },
      { url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&q=80', alt: 'Cheesecake' },
    ],
  },
];

interface StockImageGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

export function StockImageGallery({ open, onOpenChange, onSelect }: StockImageGalleryProps) {
  const [activeCategory, setActiveCategory] = useState(GALLERY[0].name);

  const currentImages = useMemo(
    () => GALLERY.find((c) => c.name === activeCategory)?.images ?? [],
    [activeCategory]
  );

  function handleSelect(url: string) {
    onSelect(url);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">Galeria de Imagens</DialogTitle>
        </DialogHeader>

        {/* Category tabs */}
        <ScrollArea className="w-full border-b">
          <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
            {GALLERY.map((cat) => (
              <Button
                key={cat.name}
                type="button"
                size="sm"
                variant={activeCategory === cat.name ? 'default' : 'ghost'}
                className="shrink-0 text-xs h-8"
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Image grid */}
        <ScrollArea className="flex-1 min-h-0 px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            {currentImages.map((img) => (
              <button
                key={img.url}
                type="button"
                onClick={() => handleSelect(img.url)}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 border-transparent',
                  'hover:border-primary focus:border-primary focus:outline-none transition-colors'
                )}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
