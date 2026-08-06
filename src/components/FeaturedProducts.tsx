import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { ProductCard } from './ProductCard';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -280 : 280,
        behavior: 'smooth',
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-xl text-foreground flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          Mais Pedidos
        </h2>
        {products.length > 1 && (
          <div className="hidden sm:flex gap-1.5">
            <button
              className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              onClick={() => scroll('left')}
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              onClick={() => scroll('right')}
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="min-w-[260px] max-w-[280px] snap-start flex-shrink-0"
          >
            <ProductCard
              id={product.id}
              name={product.name}
              description={product.description || undefined}
              price={product.price}
              image_url={product.image_url || undefined}
              has_free_addons={(product as any).has_free_addons}
              free_addons_limit={(product as any).free_addons_limit}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
