import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Layers, Scale, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';

const segments = [
  {
    id: 'acai',
    title: 'Açaiteria',
    subtitle: 'Monte seu açaí perfeito',
    description: 'Sistema de adicionais inteligente para montagem personalizada. Seus clientes escolhem frutas, granola, leite em pó e muito mais.',
    color: 'from-purple-500 to-pink-500',
    icon: Plus,
    features: ['Adicionais ilimitados', 'Tamanhos personalizados', 'Combos especiais'],
    mockup: '🍇',
  },
  {
    id: 'pizza',
    title: 'Pizzaria',
    subtitle: 'Sabores que vendem',
    description: 'Suporte completo para pizzas meio a meio, bordas recheadas e promoções especiais. Gestão simplificada do cardápio.',
    color: 'from-orange-500 to-red-500',
    icon: Layers,
    features: ['Meio a meio', 'Bordas especiais', 'Promoções por dia'],
    mockup: '🍕',
  },
  {
    id: 'hortifruti',
    title: 'Hortifruti',
    subtitle: 'Frescor na palma da mão',
    description: 'Venda por peso ou unidade com facilidade. Controle de estoque e destaque para produtos frescos do dia.',
    color: 'from-green-500 to-emerald-500',
    icon: Scale,
    features: ['Venda por peso', 'Estoque em tempo real', 'Ofertas do dia'],
    mockup: '🥬',
  },
  {
    id: 'restaurante',
    title: 'Restaurante',
    subtitle: 'Agilidade no atendimento',
    description: 'Otimizado para alto volume de pedidos. Gestão de mesas, balcão e delivery em uma única plataforma.',
    color: 'from-amber-500 to-orange-500',
    icon: Utensils,
    features: ['Multi-canal', 'Gestão de mesas', 'Pedidos rápidos'],
    mockup: '🍽️',
  },
];

export function SegmentShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSegment = () => setActiveIndex((prev) => (prev + 1) % segments.length);
  const prevSegment = () => setActiveIndex((prev) => (prev - 1 + segments.length) % segments.length);

  const active = segments[activeIndex];

  return (
    <div className="relative">
      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {segments.map((segment, index) => (
          <button
            key={segment.id}
            onClick={() => setActiveIndex(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? 'bg-primary w-8'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative overflow-hidden rounded-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            {/* Text Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <active.icon className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground/80">{active.subtitle}</span>
              </div>
              
              <h3 className="font-display text-4xl md:text-5xl text-foreground">
                {active.title}
              </h3>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                {active.description}
              </p>

              <ul className="space-y-3">
                {active.features.map((feature, idx) => (
                  <motion.li
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 text-foreground/90"
                  >
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${active.color}`} />
                    {feature}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Visual Mockup */}
            <div className="relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className={`aspect-square max-w-sm mx-auto rounded-3xl bg-gradient-to-br ${active.color} p-1`}
              >
                <div className="w-full h-full rounded-3xl bg-card/90 backdrop-blur-xl flex items-center justify-center">
                  <motion.span
                    animate={{ 
                      y: [0, -10, 0],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="text-8xl md:text-9xl drop-shadow-2xl"
                  >
                    {active.mockup}
                  </motion.span>
                </div>
              </motion.div>

              {/* Decorative elements */}
              <div className={`absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full bg-gradient-to-r ${active.color} opacity-20 blur-3xl`} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      <div className="flex justify-center gap-4 mt-8">
        <Button
          variant="outline"
          size="icon"
          onClick={prevSegment}
          className="rounded-full border-border hover:bg-primary/10 hover:border-primary"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={nextSegment}
          className="rounded-full border-border hover:bg-primary/10 hover:border-primary"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
