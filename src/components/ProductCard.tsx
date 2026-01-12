import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart';

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
}

export function ProductCard({ id, name, description, price, image_url }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({ id, name, price, image_url });
  };

  return (
    <div className="glass-card p-4 group hover:border-primary/40 transition-all duration-300 animate-fade-in">
      <div className="flex gap-4">
        {image_url && (
          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
            <img
              src={image_url}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        )}
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
              className="btn-glow bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
