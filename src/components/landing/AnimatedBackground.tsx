import { motion, useReducedMotion } from 'framer-motion';

/**
 * Ambient animated background for the landing page.
 * - Three slow-drifting gradient blobs (orange / emerald / amber)
 * - Fine dot-grid overlay for depth
 * - Respects prefers-reduced-motion
 * - Fully behind content (z-0, pointer-events-none)
 */
export function AnimatedBackground() {
  const reduce = useReducedMotion();

  const blob = (extra: number) =>
    reduce
      ? undefined
      : {
          animate: {
            x: [0, 40, -30, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.15, 0.95, 1],
          },
          transition: {
            duration: 22 + extra,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.25]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.12) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
        }}
      />

      {/* Blobs */}
      <motion.div
        {...(blob(0) || {})}
        className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, hsl(25 95% 55% / 0.35) 0%, transparent 65%)',
        }}
      />
      <motion.div
        {...(blob(6) || {})}
        className="absolute top-1/3 -right-40 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, hsl(145 70% 50% / 0.25) 0%, transparent 65%)',
        }}
      />
      <motion.div
        {...(blob(12) || {})}
        className="absolute bottom-0 left-1/4 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, hsl(45 95% 55% / 0.22) 0%, transparent 65%)',
        }}
      />

      {/* Subtle top vignette to blend with nav */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/70 to-transparent" />
    </div>
  );
}
