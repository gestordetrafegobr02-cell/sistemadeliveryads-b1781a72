import { useRef, useState, ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Tilt3DCardProps {
  children: ReactNode;
  className?: string;
  max?: number; // max rotation degrees
}

/**
 * Realistic 3D tilt card that follows the cursor with spring physics.
 * Uses CSS perspective + transform-style: preserve-3d so children with
 * translateZ pop forward giving genuine depth (not fake gradients).
 */
export function Tilt3DCard({ children, className = '', max = 12 }: Tilt3DCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [max, -max]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-max, max]), { stiffness: 200, damping: 20 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
    setHovering(false);
  };

  return (
    <div style={{ perspective: 1200 }} className={className}>
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={reset}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-full h-full will-change-transform"
      >
        {/* Specular highlight that follows the cursor */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
          style={{
            opacity: hovering ? 0.35 : 0,
            background: useTransform(
              [x, y],
              ([lx, ly]) =>
                `radial-gradient(600px circle at ${(lx as number) * 100 + 50}% ${
                  (ly as number) * 100 + 50
                }%, rgba(255,255,255,0.35), transparent 40%)`,
            ),
            mixBlendMode: 'overlay',
          }}
        />
        {children}
      </motion.div>
    </div>
  );
}
