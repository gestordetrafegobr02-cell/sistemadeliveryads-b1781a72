import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface CategoriesBarProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryClick: (categoryId: string | null) => void;
}

export function CategoriesBar({ categories, activeCategory, onCategoryClick }: CategoriesBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (categories.length === 0) return null;

  return (
    <div className="sticky top-[73px] z-30 glass-card border-b border-border/50 py-3">
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative flex items-center gap-2">
          {/* Left scroll button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex shrink-0 w-8 h-8"
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Scrollable categories */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* All categories button */}
            <Button
              variant={activeCategory === null ? 'default' : 'outline'}
              size="sm"
              className={`shrink-0 snap-start transition-all duration-200 ${
                activeCategory === null 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary'
              }`}
              onClick={() => onCategoryClick(null)}
            >
              Todos
            </Button>

            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className={`shrink-0 snap-start transition-all duration-200 ${
                  activeCategory === category.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
                onClick={() => onCategoryClick(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Right scroll button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex shrink-0 w-8 h-8"
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
