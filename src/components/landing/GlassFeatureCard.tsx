import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface GlassFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean;
  delay?: number;
}

export function GlassFeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  highlight = false,
  delay = 0 
}: GlassFeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`relative group ${highlight ? 'md:col-span-2 lg:col-span-1' : ''}`}
    >
      {/* Glow effect for highlighted cards */}
      {highlight && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-emerald-500 to-primary rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500" />
      )}
      
      <div className={`relative h-full p-6 md:p-8 rounded-2xl border transition-all duration-500 ${
        highlight 
          ? 'bg-gradient-to-br from-card/80 to-card/40 border-primary/30 hover:border-primary/60' 
          : 'bg-card/50 border-border/50 hover:border-primary/40'
      } backdrop-blur-xl`}>
        {/* Icon container */}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 ${
          highlight 
            ? 'bg-gradient-to-br from-primary/30 to-emerald-500/30 group-hover:shadow-lg group-hover:shadow-primary/20' 
            : 'bg-primary/10 group-hover:bg-primary/20'
        }`}>
          <Icon className={`w-7 h-7 ${highlight ? 'text-primary' : 'text-primary/80'}`} />
        </div>

        {/* Badge for highlighted */}
        {highlight && (
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.3, type: 'spring' }}
            className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-emerald-500 text-xs font-bold text-primary-foreground"
          >
            ⭐ Destaque
          </motion.div>
        )}

        <h4 className={`font-display text-xl md:text-2xl mb-3 ${
          highlight ? 'text-foreground' : 'text-foreground/90'
        }`}>
          {title}
        </h4>
        
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>

        {/* Subtle shine effect */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/5 to-transparent rotate-12 translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
        </div>
      </div>
    </motion.div>
  );
}
