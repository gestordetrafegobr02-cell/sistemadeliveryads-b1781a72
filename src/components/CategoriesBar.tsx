import { useRef, useEffect, useState } from 'react';
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollEl.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Scroll active category into view
  useEffect(() => {
    if (scrollRef.current && activeCategory) {
      const activeBtn = scrollRef.current.querySelector(`[data-category="${activeCategory}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  if (categories.length === 0) return null;

  return (
    <div className="sticky top-[73px] z-30 glass-card border-b border-border/50 py-3 mb-2">
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative flex items-center gap-2">
          {/* Left scroll button - only show when can scroll */}
          <Button
            variant="ghost"
            size="icon"
            className={`hidden sm:flex shrink-0 w-8 h-8 transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => scroll('left')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Scrollable categories - enhanced for mobile swipe */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth touch-pan-x"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* All categories button */}
            <Button
              variant={activeCategory === null ? 'default' : 'outline'}
              size="sm"
              data-category="all"
              className={`shrink-0 snap-start transition-all duration-200 min-w-fit ${
                activeCategory === null 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-secondary'
              }`}
              onClick={() => onCategoryClick(null)}
            >
              Todos
            </Button>

            {categories.map((category) => (
              <Button
                key={category.id}
                data-category={category.id}
                variant={activeCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className={`shrink-0 snap-start transition-all duration-200 min-w-fit ${
                  activeCategory === category.id 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'hover:bg-secondary'
                }`}
                onClick={() => onCategoryClick(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Right scroll button - only show when can scroll */}
          <Button
            variant="ghost"
            size="icon"
            className={`hidden sm:flex shrink-0 w-8 h-8 transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => scroll('right')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
