import { Badge } from '@/components/ui/badge';
import { Clock, ChefHat, Truck, CheckCircle, XCircle } from 'lucide-react';

type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'completed' | 'cancelled';

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
    label: 'A caminho',
    className: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    icon: Truck,
  },
  completed: {
    label: 'Concluído',
    className: 'bg-green-500/20 text-green-500 border-green-500/30',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-500/20 text-red-500 border-red-500/30',
    icon: XCircle,
  },
};

function normalize(status: string | null): OrderStatus {
  const s = (status || 'pending').toLowerCase();
  if (s === 'cancelado' || s === 'canceled' || s === 'cancelled') return 'cancelled';
  if (s === 'a_caminho' || s === 'shipped' || s === 'out_for_delivery') return 'out_for_delivery';
  if (s === 'concluido' || s === 'entregue' || s === 'completed') return 'completed';
  if (s === 'preparing' || s === 'preparando') return 'preparing';
  return 'pending';
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const normalizedStatus = normalize(status);
  const config = statusConfig[normalizedStatus];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

export function isPaidStatus(orderStatus: string | null, paymentMethod: string | null): boolean {
  const s = normalize(orderStatus);
  // Cash/card on delivery becomes paid once the order is on the way or completed
  if (s === 'out_for_delivery' || s === 'completed') return true;
  if (paymentMethod === 'mercadopago_paid' || paymentMethod === 'pix_paid') return true;
  return false;
}

export function getNextStatus(currentStatus: string | null): OrderStatus {
  const flow: OrderStatus[] = ['pending', 'preparing', 'out_for_delivery', 'completed'];
  const current = normalize(currentStatus);
  if (current === 'cancelled') return 'cancelled';
  const idx = flow.indexOf(current);
  return flow[Math.min(idx + 1, flow.length - 1)];
}

export function getAllStatuses(): { value: OrderStatus; label: string }[] {
  return [
    { value: 'pending', label: 'Pendente' },
    { value: 'preparing', label: 'Preparando' },
    { value: 'out_for_delivery', label: 'A caminho' },
    { value: 'completed', label: 'Concluído' },
    { value: 'cancelled', label: 'Cancelado' },
  ];
}
