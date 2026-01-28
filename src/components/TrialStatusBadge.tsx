import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TrialStatusBadgeProps {
  trialExpiresAt: string | null;
  showDate?: boolean;
  className?: string;
}

export function TrialStatusBadge({ trialExpiresAt, showDate = true, className }: TrialStatusBadgeProps) {
  if (!trialExpiresAt) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Ilimitado
      </Badge>
    );
  }

  const expiryDate = new Date(trialExpiresAt);
  const now = new Date();
  const daysRemaining = differenceInDays(expiryDate, now);
  const isExpired = expiryDate < now;
  const formattedDate = format(expiryDate, 'dd/MM/yyyy', { locale: ptBR });

  if (isExpired) {
    const daysExpired = Math.abs(daysRemaining);
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className={cn("text-xs cursor-help", className)}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expirado há {daysExpired} dia{daysExpired !== 1 ? 's' : ''}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Expirou em {formattedDate}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className={cn("text-xs cursor-help animate-pulse", className)}>
            <Clock className="w-3 h-3 mr-1" />
            {daysRemaining === 0 ? 'Expira hoje!' : `Expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Expira em {formattedDate}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (daysRemaining <= 7) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={cn("text-xs cursor-help bg-yellow-500/20 text-yellow-600 border-yellow-500/30", className)}>
            <Clock className="w-3 h-3 mr-1" />
            Expira em {daysRemaining} dias
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Expira em {formattedDate}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("text-xs cursor-help text-emerald-600 border-emerald-500/30", className)}>
          <Clock className="w-3 h-3 mr-1" />
          {daysRemaining} dias restantes
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Expira em {formattedDate}</p>
      </TooltipContent>
    </Tooltip>
  );
}
