import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import {
  Smartphone,
  ShoppingBag,
  TrendingUp,
  Zap,
  BarChart3,
  MessageCircle,
} from 'lucide-react';

const floatingCards = [
  {
    icon: Smartphone,
    label: 'App na Tela',
    color: 'from-blue-500 to-cyan-500',
    x: '-42%',
    y: '-30%',
    rotate: -12,
    delay: 0,
  },
  {
    icon: ShoppingBag,
    label: 'Pedidos WhatsApp',
    color: 'from-emerald-500 to-teal-500',
    x: '38%',
    y: '-25%',
    rotate: 10,
    delay: 0.1,
  },
  {
    icon: TrendingUp,
    label: '+15% Ticket',
    color: 'from-orange-500 to-red-500',
    x: '-50%',
    y: '20%',
    rotate: 8,
    delay: 0.2,
  },
  {
    icon: MessageCircle,
    label: 'Upsell Auto',
    color: 'from-purple-500 to-pink-500',
    x: '45%',
    y: '25%',
    rotate: -8,
    delay: 0.3,
  },
  {
    icon: BarChart3,
    label: 'Relatórios',
    color: 'from-indigo-500 to-blue-500',
    x: '0%',
    y: '-45%',
    rotate: 0,
    delay: 0.4,
  },
  {
    icon: Zap,
    label: 'Setup 5min',
    color: 'from-amber-500 to-yellow-500',
    x: '0%',
    y: '42%',
    rotate: 0,
    delay: 0.5,
  },
];

export function Floating3DScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const y2 = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-32 px-4 overflow-hidden bg-gradient-to-b from-background via-secondary/40 to-background"
    >
      {/* Ambient glow */}
      <motion.div
        style={{ y: y1 }}
        className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-emerald/10 blur-3xl pointer-events-none"
      />

      <div className="max-w-5xl mx-auto text-center relative">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
        >
          ✨ Ecossistema completo
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl md:text-5xl font-bold text-foreground mb-4"
        >
          Tudo que sua loja precisa
          <br />
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            em um só lugar
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-16"
        >
          Cardápio, pedidos, upsell e relatórios — integrados e prontos pra usar
        </motion.p>

        {/* 3D Floating Stage */}
        <div
          className="relative mx-auto"
          style={{
            perspective: '1200px',
            perspectiveOrigin: '50% 50%',
            height: 'min(560px, 90vw)',
            maxWidth: '520px',
          }}
        >
          {/* Central glow disc */}
          <motion.div
            style={{ rotate }}
            className="absolute inset-0 m-auto w-56 h-56 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-2xl"
          />

          {/* Central hub */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotateY: -30 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="relative w-32 h-32 md:w-40 md:h-40">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-primary/60 shadow-2xl shadow-primary/50 flex items-center justify-center">
                <span className="text-4xl md:text-5xl font-black text-white">D</span>
              </div>
              <div
                className="absolute inset-0 rounded-3xl bg-primary/40 blur-xl"
                style={{ transform: 'translateZ(-30px)' }}
              />
            </div>
          </motion.div>

          {/* Orbiting cards */}
          {floatingCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.3, rotateZ: card.rotate * 3 }}
                whileInView={{
                  opacity: 1,
                  scale: 1,
                  rotateZ: card.rotate,
                }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{
                  duration: 0.8,
                  delay: card.delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute top-1/2 left-1/2 z-10"
                style={{
                  x: card.x,
                  y: card.y,
                  translateX: '-50%',
                  translateY: '-50%',
                  transformStyle: 'preserve-3d',
                }}
              >
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                  }}
                  transition={{
                    duration: 3 + i * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="group"
                >
                  <div
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${card.color} p-[2px] shadow-xl`}
                    style={{
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="w-full h-full rounded-2xl bg-card/95 backdrop-blur flex flex-col items-center justify-center gap-1">
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br ${card.color} bg-clip-text`} style={{ color: 'transparent', stroke: 'url(#grad)' }} />
                      <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                        <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" strokeWidth={2.5} />
                      </div>
                      <span className="text-[9px] md:text-[10px] font-semibold text-foreground/80 whitespace-nowrap px-1">
                        {card.label}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}

          {/* Connecting lines (SVG) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))' }}
          >
            <defs>
              <radialGradient id="lineGrad">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              </radialGradient>
            </defs>
            <motion.circle
              cx="50%"
              cy="50%"
              r="120"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="1"
              strokeDasharray="4 6"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.6 }}
              viewport={{ once: true }}
              transition={{ duration: 2 }}
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
