import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnimatedCTAButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  size?: 'default' | 'lg';
  className?: string;
}

export function AnimatedCTAButton({ 
  onClick, 
  children, 
  size = 'lg',
  className = '' 
}: AnimatedCTAButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative group"
    >
      {/* Animated glow border */}
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary via-emerald-500 to-primary opacity-70 blur-md group-hover:opacity-100 transition-opacity duration-500 animate-pulse-slow" />
      
      {/* Sweeping shine effect */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
          animate={{ x: ['0%', '200%'] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
        />
      </div>
      
      <Button 
        size={size}
        onClick={onClick}
        className={`relative bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-primary-foreground border-0 h-14 px-8 text-lg gap-3 group ${className}`}
      >
        {children}
        <motion.span
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ArrowRight className="w-5 h-5" />
        </motion.span>
      </Button>
    </motion.div>
  );
}
