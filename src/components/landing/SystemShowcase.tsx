import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneMockup } from './PhoneMockup';
import { BurgerMockup } from './mockups/BurgerMockup';
import { AcaiMockup } from './mockups/AcaiMockup';
import { PizzaMockup } from './mockups/PizzaMockup';
import { HortifrutiMockup } from './mockups/HortifrutiMockup';

const segments = [
  {
    id: 'burger',
    title: 'Hamburgueria',
    description: 'Aumente seu ticket médio com combos e adicionais.',
    mockup: BurgerMockup,
    demoUrl: '/demo/burger-shop',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    id: 'pizza',
    title: 'Pizzaria',
    description: 'Pizza meio a meio, bordas recheadas e adicionais por sabor.',
    mockup: PizzaMockup,
    demoUrl: '/demo/pizza',
    gradient: 'from-orange-500 to-red-600',
    highlight: true,
  },
  {
    id: 'acai',
    title: 'Açaiteria',
    description: 'Facilite a montagem e evite erros nos pedidos.',
    mockup: AcaiMockup,
    demoUrl: '/demo/acai-shop',
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'hortifruti',
    title: 'Hortifruti',
    description: 'Venda por peso ou unidade com fotos reais dos seus produtos.',
    mockup: HortifrutiMockup,
    demoUrl: '/demo/grocery',
    gradient: 'from-green-500 to-emerald-600',
  },
];

// Duplicate for infinite scroll
const duplicatedSegments = [...segments, ...segments, ...segments];

interface SystemShowcaseProps {
  onCtaClick: () => void;
}

export function SystemShowcase({ onCtaClick }: SystemShowcaseProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.4;
    let isPaused = false;

    const animate = () => {
      if (!isPaused) {
        scrollPosition += scrollSpeed;
        
        // Reset position when reaching duplicate point
        const oneSetWidth = scrollContainer.scrollWidth / 3;
        if (scrollPosition >= oneSetWidth) {
          scrollPosition = 0;
        }
        
        scrollContainer.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    // Pause on hover
    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleDemoClick = (e: React.MouseEvent, demoUrl: string) => {
    e.stopPropagation();
    const fullUrl = `${window.location.origin}${demoUrl}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-12">
      {/* Carousel */}
      <div className="relative overflow-hidden">
        {/* Gradient fades - using theme colors */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-secondary to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-secondary to-transparent z-10 pointer-events-none" />
        
        <div
          ref={scrollRef}
          className="flex gap-6 md:gap-8 overflow-x-auto py-12 pb-16 px-6 md:px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {duplicatedSegments.map((segment, index) => (
            <motion.div
              key={`${segment.id}-${index}`}
              className="flex-shrink-0 group cursor-pointer"
              whileHover={{ scale: 1.03, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => handleDemoClick(e, segment.demoUrl)}
            >
              <div className="relative transition-shadow duration-300 group-hover:shadow-xl rounded-3xl">
                {/* Trial Badge */}
                <div className="absolute -top-3 -right-2 z-20">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r ${segment.gradient} text-white text-xs font-semibold shadow-lg`}>
                    {(segment as any).highlight ? '⭐ Destaque' : '7 dias grátis'}
                  </span>
                </div>

                {/* Phone Mockup */}
                <PhoneMockup className="transition-transform duration-300">
                  <segment.mockup />
                </PhoneMockup>

                {/* Card Info */}
                <div className="mt-5 text-center space-y-2 px-2">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                    {segment.title}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                    {segment.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <motion.div 
        className="text-center space-y-6 pt-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-2">
          <h3 className="text-2xl md:text-3xl font-semibold text-foreground">
            Gostou? Sua loja pode ficar assim em menos de 5 minutos.
          </h3>
          <p className="text-muted-foreground">
            Escolha seu segmento e comece a vender hoje mesmo
          </p>
        </div>

        <Button 
          size="lg"
          onClick={onCtaClick}
          className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white gap-2"
        >
          Criar Minha Loja Agora
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}
