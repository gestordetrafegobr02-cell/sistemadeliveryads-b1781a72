import { Badge } from '@/components/ui/badge';
import { Clock, ChefHat, Truck, CheckCircle } from 'lucide-react';

type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'completed';

interface OrderStatusBadgeProps {
  status: string | null;
}

const statusConfig: Record<OrderStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: {
    label: 'Pendente',
    className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    icon: Clock,
  },
  preparing: {
    label: 'Preparando',
    className: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    icon: ChefHat,
  },
  out_for_delivery: {
    label: 'Saiu para Entrega',
    className: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    icon: Truck,
  },
  completed: {
    label: 'Concluído',
    className: 'bg-green-500/20 text-green-500 border-green-500/30',
    icon: CheckCircle,
  },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const normalizedStatus = (status || 'pending') as OrderStatus;
  const config = statusConfig[normalizedStatus] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export function getNextStatus(currentStatus: string | null): OrderStatus {
  const flow: OrderStatus[] = ['pending', 'preparing', 'out_for_delivery', 'completed'];
  const currentIndex = flow.indexOf((currentStatus || 'pending') as OrderStatus);
  return flow[Math.min(currentIndex + 1, flow.length - 1)];
}

export function getAllStatuses(): { value: OrderStatus; label: string }[] {
  return [
    { value: 'pending', label: 'Pendente' },
    { value: 'preparing', label: 'Preparando' },
    { value: 'out_for_delivery', label: 'Saiu para Entrega' },
    { value: 'completed', label: 'Concluído' },
  ];
}
