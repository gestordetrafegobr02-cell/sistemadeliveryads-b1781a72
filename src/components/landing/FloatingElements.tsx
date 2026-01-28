import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const floatingItems = [
  { emoji: '🍔', size: 'text-5xl', initialX: '10%', initialY: '20%' },
  { emoji: '🍕', size: 'text-4xl', initialX: '85%', initialY: '15%' },
  { emoji: '🍟', size: 'text-3xl', initialX: '75%', initialY: '70%' },
  { emoji: '🥤', size: 'text-4xl', initialX: '15%', initialY: '75%' },
  { emoji: '🍇', size: 'text-3xl', initialX: '90%', initialY: '45%' },
  { emoji: '🧁', size: 'text-4xl', initialX: '5%', initialY: '50%' },
];

export function FloatingElements() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 30,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {floatingItems.map((item, index) => (
        <motion.div
          key={index}
          className={`absolute ${item.size} select-none opacity-60`}
          style={{ left: item.initialX, top: item.initialY }}
          animate={{
            x: mousePosition.x * (index % 2 === 0 ? 1 : -1) * 0.5,
            y: mousePosition.y * (index % 2 === 0 ? -1 : 1) * 0.5,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 0.6, scale: 1 }}
          viewport={{ once: true }}
        >
          <motion.span
            animate={{
              y: [0, -15, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4 + index,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="block drop-shadow-2xl"
          >
            {item.emoji}
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}
