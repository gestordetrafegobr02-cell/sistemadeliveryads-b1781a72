import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StoreStatusBadgeProps {
  isOpen: boolean;
  className?: string;
}

export function StoreStatusBadge({ isOpen, className }: StoreStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'px-3 py-1 text-sm font-medium animate-fade-in',
        isOpen
          ? 'bg-green-500/20 text-green-500 border-green-500/30'
          : 'bg-destructive/20 text-destructive border-destructive/30',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full mr-2 animate-pulse',
          isOpen ? 'bg-green-500' : 'bg-destructive'
        )}
      />
      {isOpen ? 'Aberto agora' : 'Fechado no momento'}
    </Badge>
  );
}
