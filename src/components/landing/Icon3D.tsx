import { motion } from 'framer-motion';

interface Icon3DProps {
  src: string;
  alt: string;
  size?: number;
  delay?: number;
  glowColor?: string;
}

export function Icon3D({ src, alt, size = 120, delay = 0, glowColor = 'hsl(var(--primary))' }: Icon3DProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.6, rotateY: -30 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, rotateY: 8, scale: 1.05 }}
      className="relative inline-block"
      style={{ transformStyle: 'preserve-3d', perspective: 800 }}
    >
      <div
        className="absolute inset-0 blur-2xl opacity-40 rounded-full"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, transform: 'translateZ(-40px) scale(0.85)' }}
      />
      <motion.img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        className="relative drop-shadow-2xl"
        style={{ width: size, height: size, objectFit: 'contain' }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
