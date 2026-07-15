import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import iconSmartphone from '@/assets/landing/icon3d-smartphone.png';
import iconBag from '@/assets/landing/icon3d-bag.png';
import iconScooter from '@/assets/landing/icon3d-scooter.png';
import iconChart from '@/assets/landing/icon3d-chart.png';
import iconChat from '@/assets/landing/icon3d-chat.png';
import iconPrinter from '@/assets/landing/icon3d-printer.png';

const floatingCards = [
  { img: iconSmartphone, label: 'App na Tela',       x: '-46%', y: '-30%', rotate: -10, delay: 0.00 },
  { img: iconBag,        label: 'Sacola de Entrega', x: '42%',  y: '-25%', rotate: 8,   delay: 0.10 },
  { img: iconScooter,    label: 'Delivery Ágil',     x: '-52%', y: '20%',  rotate: 6,   delay: 0.20 },
  { img: iconChat,       label: 'WhatsApp Direto',   x: '48%',  y: '25%',  rotate: -8,  delay: 0.30 },
  { img: iconChart,      label: '+15% Ticket',       x: '0%',   y: '-46%', rotate: 0,   delay: 0.40 },
  { img: iconPrinter,    label: 'Impressão Auto',    x: '0%',   y: '44%',  rotate: 0,   delay: 0.50 },
];

export function Floating3DScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [-40, 40]);
  const y2 = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-32 px-4 overflow-hidden"
    >
      <motion.div
        style={{ y: y1 }}
        className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />
      <motion.div
        style={{ y: y2 }}
        className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"
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

        <div
          className="relative mx-auto"
          style={{
            perspective: '1200px',
            perspectiveOrigin: '50% 50%',
            height: 'min(580px, 92vw)',
            maxWidth: '560px',
          }}
        >
          <motion.div
            style={{ rotate }}
            className="absolute inset-0 m-auto w-64 h-64 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-2xl"
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

          {/* Orbiting 3D icons */}
          {floatingCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.3, rotateZ: card.rotate * 3 }}
              whileInView={{ opacity: 1, scale: 1, rotateZ: card.rotate }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.9,
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
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 3 + i * 0.35,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="flex flex-col items-center gap-2"
              >
                <img
                  src={card.img}
                  alt={card.label}
                  loading="lazy"
                  className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.35)]"
                />
                <span className="text-[10px] md:text-xs font-semibold text-foreground/80 whitespace-nowrap bg-card/80 backdrop-blur px-2 py-0.5 rounded-full border border-border">
                  {card.label}
                </span>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
