import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const segments = [
  { text: 'Hamburgueria', emoji: '🍔' },
  { text: 'Açaiteria', emoji: '🍇' },
  { text: 'Pizzaria', emoji: '🍕' },
  { text: 'Hortifruti', emoji: '🥬' },
  { text: 'Restaurante', emoji: '🍽️' },
  { text: 'Doceria', emoji: '🧁' },
];

export function RotatingText() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % segments.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-3 text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--emerald)) 100%)',
          }}
        >
          <motion.span
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl"
          >
            {segments[currentIndex].emoji}
          </motion.span>
          {segments[currentIndex].text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
