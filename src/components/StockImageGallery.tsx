import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Hambúrgueres
import burgerXtudo from '@/assets/gallery/burger-xtudo.jpg';
import burgerXbacon from '@/assets/gallery/burger-xbacon.jpg';
import burgerHotdog from '@/assets/gallery/burger-hotdog.jpg';
import burgerSmash from '@/assets/gallery/burger-smash.jpg';
import burgerXsalada from '@/assets/gallery/burger-xsalada.jpg';
import burgerXegg from '@/assets/gallery/burger-xegg.jpg';

// Pizzas
import pizzaCalabresa from '@/assets/gallery/pizza-calabresa.jpg';
import pizzaFrango from '@/assets/gallery/pizza-frango.jpg';
import pizzaPortuguesa from '@/assets/gallery/pizza-portuguesa.jpg';
import pizza4queijos from '@/assets/gallery/pizza-4queijos.jpg';
import pizzaFatia from '@/assets/gallery/pizza-fatia.jpg';
import pizzaMargherita from '@/assets/gallery/pizza-margherita.jpg';

// Açaí
import acaiCopo1 from '@/assets/gallery/acai-copo1.jpg';
import acaiCopo2 from '@/assets/gallery/acai-copo2.jpg';
import acaiBowl from '@/assets/gallery/acai-bowl.jpg';
import acaiSmoothie from '@/assets/gallery/acai-smoothie.jpg';
import acaiNutella from '@/assets/gallery/acai-nutella.jpg';
import acaiPacoca from '@/assets/gallery/acai-pacoca.jpg';

// Bebidas
import bebidaRefri from '@/assets/gallery/bebida-refri.jpg';
import bebidaSuco from '@/assets/gallery/bebida-suco.jpg';
import bebidaCoca from '@/assets/gallery/bebida-coca.jpg';
import bebidaMilkshake from '@/assets/gallery/bebida-milkshake.jpg';
import bebidaAgua from '@/assets/gallery/bebida-agua.jpg';
import bebidaCafe from '@/assets/gallery/bebida-cafe.jpg';

// Porções
import porcaoBatataCheddar from '@/assets/gallery/porcao-batata-cheddar.jpg';
import porcaoCalabresa from '@/assets/gallery/porcao-calabresa.jpg';
import porcaoNuggets from '@/assets/gallery/porcao-nuggets.jpg';
import porcaoOnion from '@/assets/gallery/porcao-onion.jpg';
import porcaoFrango from '@/assets/gallery/porcao-frango.jpg';
import porcaoMandioca from '@/assets/gallery/porcao-mandioca.jpg';

// Sobremesas
import docePudim from '@/assets/gallery/doce-pudim.jpg';
import doceBrownie from '@/assets/gallery/doce-brownie.jpg';
import doceBolo from '@/assets/gallery/doce-bolo.jpg';
import docePetit from '@/assets/gallery/doce-petit.jpg';
import doceBrigadeiro from '@/assets/gallery/doce-brigadeiro.jpg';
import doceSorvete from '@/assets/gallery/doce-sorvete.jpg';

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
    name: 'Hambúrgueres',
    images: [
      { url: burgerXtudo, alt: 'X-Tudo completo' },
      { url: burgerXbacon, alt: 'X-Bacon suculento' },
      { url: burgerHotdog, alt: 'Hot Dog prensado' },
      { url: burgerSmash, alt: 'Smash burger duplo' },
      { url: burgerXsalada, alt: 'X-Salada' },
      { url: burgerXegg, alt: 'X-Egg com ovo' },
    ],
  },
  {
    name: 'Pizzas',
    images: [
      { url: pizzaCalabresa, alt: 'Pizza calabresa acebolada' },
      { url: pizzaFrango, alt: 'Pizza frango com catupiry' },
      { url: pizzaPortuguesa, alt: 'Pizza portuguesa' },
      { url: pizza4queijos, alt: 'Pizza quatro queijos' },
      { url: pizzaFatia, alt: 'Fatia de pizza' },
      { url: pizzaMargherita, alt: 'Pizza margherita' },
    ],
  },
  {
    name: 'Açaí',
    images: [
      { url: acaiCopo1, alt: 'Açaí com morango e banana' },
      { url: acaiCopo2, alt: 'Açaí com granola e leite condensado' },
      { url: acaiBowl, alt: 'Açaí bowl com frutas' },
      { url: acaiSmoothie, alt: 'Açaí no copo com canudo' },
      { url: acaiNutella, alt: 'Açaí com Nutella e morango' },
      { url: acaiPacoca, alt: 'Açaí com paçoca e leite em pó' },
    ],
  },
  {
    name: 'Bebidas',
    images: [
      { url: bebidaRefri, alt: 'Latas de refrigerante geladas' },
      { url: bebidaCoca, alt: 'Coca-Cola gelada' },
      { url: bebidaSuco, alt: 'Suco natural de laranja' },
      { url: bebidaMilkshake, alt: 'Milkshake de chocolate' },
      { url: bebidaAgua, alt: 'Água e água de coco' },
      { url: bebidaCafe, alt: 'Café expresso' },
    ],
  },
  {
    name: 'Porções',
    images: [
      { url: porcaoBatataCheddar, alt: 'Batata com cheddar e bacon' },
      { url: porcaoCalabresa, alt: 'Calabresa acebolada' },
      { url: porcaoNuggets, alt: 'Nuggets com molho' },
      { url: porcaoOnion, alt: 'Onion rings' },
      { url: porcaoFrango, alt: 'Frango frito' },
      { url: porcaoMandioca, alt: 'Mandioca frita' },
    ],
  },
  {
    name: 'Sobremesas',
    images: [
      { url: docePudim, alt: 'Pudim de leite' },
      { url: doceBrownie, alt: 'Brownie com sorvete' },
      { url: doceBolo, alt: 'Bolo de chocolate' },
      { url: docePetit, alt: 'Petit gâteau' },
      { url: doceBrigadeiro, alt: 'Brigadeiros' },
      { url: doceSorvete, alt: 'Sorvete 3 sabores' },
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
                key={img.alt}
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
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                  {img.alt}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
