import { useRef, useEffect } from 'react';
import showcaseAcai from '@/assets/showcase-acai.jpg';
import showcaseBurger from '@/assets/showcase-burger.jpg';
import showcasePizza from '@/assets/showcase-pizza.jpg';
import showcaseHortifruti from '@/assets/showcase-hortifruti.jpg';
import showcaseRestaurante from '@/assets/showcase-restaurante.jpg';

const segments = [
  {
    id: 'acai',
    title: 'Cardápio de Açaiteria',
    image: showcaseAcai,
  },
  {
    id: 'burger',
    title: 'Cardápio de Hamburgueria',
    image: showcaseBurger,
  },
  {
    id: 'pizza',
    title: 'Cardápio de Pizzaria',
    image: showcasePizza,
  },
  {
    id: 'hortifruti',
    title: 'Cardápio de Hortifruti',
    image: showcaseHortifruti,
  },
  {
    id: 'restaurante',
    title: 'Cardápio de Restaurante',
    image: showcaseRestaurante,
  },
];

// Duplicate for infinite effect
const duplicatedSegments = [...segments, ...segments];

export function MenuShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      scrollPosition += scrollSpeed;
      
      // Reset position when reaching middle (duplicate point)
      const halfWidth = scrollContainer.scrollWidth / 2;
      if (scrollPosition >= halfWidth) {
        scrollPosition = 0;
      }
      
      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    // Pause on hover
    const handleMouseEnter = () => cancelAnimationFrame(animationId);
    const handleMouseLeave = () => {
      animationId = requestAnimationFrame(animate);
    };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Gradient fades */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden py-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {duplicatedSegments.map((segment, index) => (
          <div
            key={`${segment.id}-${index}`}
            className="flex-shrink-0 w-72 group"
          >
            <div className="relative rounded-2xl overflow-hidden bg-neutral-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              {/* Trial Badge */}
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-white text-xs font-medium">
                  7 dias grátis
                </span>
              </div>
              
              {/* Image */}
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={segment.image}
                  alt={segment.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              
              {/* Title */}
              <div className="p-4 bg-white">
                <h3 className="font-medium text-neutral-900 text-center">
                  {segment.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
