import { memo, useRef, useEffect, useState } from 'react';
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

// Hoisted + memoized so pill instances aren't recreated on every parent render.
const CategoryPill = memo(function CategoryPill({
  active,
  label,
  onClick,
  dataCategory,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  dataCategory: string;
}) {
  return (
    <button
      data-category={dataCategory}
      onClick={onClick}
      className={`relative shrink-0 snap-start px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
});

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
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current && activeCategory) {
      const activeBtn = scrollRef.current.querySelector(`[data-category="${activeCategory}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  if (categories.length === 0) return null;

  const CategoryPill = ({ active, label, onClick, dataCategory }: { active: boolean; label: string; onClick: () => void; dataCategory: string }) => (
    <button
      data-category={dataCategory}
      onClick={onClick}
      className={`relative shrink-0 snap-start px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
        active
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="sticky top-[73px] z-30 bg-background/80 backdrop-blur-md border-b border-border/30 py-3">
      <div className="max-w-2xl mx-auto px-4">
        <div className="relative flex items-center gap-2">
          {canScrollLeft && (
            <button
              className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-secondary/80 text-foreground hover:bg-secondary"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <CategoryPill
              active={activeCategory === null}
              label="Todos"
              onClick={() => onCategoryClick(null)}
              dataCategory="all"
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                active={activeCategory === cat.id}
                label={cat.name}
                onClick={() => onCategoryClick(cat.id)}
                dataCategory={cat.id}
              />
            ))}
          </div>

          {canScrollRight && (
            <button
              className="hidden sm:flex shrink-0 w-8 h-8 items-center justify-center rounded-full bg-secondary/80 text-foreground hover:bg-secondary"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
