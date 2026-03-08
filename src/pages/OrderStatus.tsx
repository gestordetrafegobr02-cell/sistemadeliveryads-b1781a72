import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChefHat, Truck, Clock, XCircle, ArrowLeft } from 'lucide-react';

interface OrderData {
  id: string;
  status: string;
  total: number;
  items: unknown;
  payment_method: string;
  created_at: string;
  store_name: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: { name: string; price: number }[];
  observation?: string;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Pedido Recebido', icon: Clock, color: 'text-yellow-500' },
  { key: 'preparing', label: 'Em Preparo', icon: ChefHat, color: 'text-blue-500' },
  { key: 'out_for_delivery', label: 'Saiu para Entrega', icon: Truck, color: 'text-purple-500' },
  { key: 'completed', label: 'Entregue', icon: CheckCircle, color: 'text-green-500' },
];

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionToken = typeof window !== 'undefined'
    ? localStorage.getItem(`order_session_${orderId}`) || ''
    : '';

  useEffect(() => {
    if (!orderId || !sessionToken) {
      setError('Pedido não encontrado');
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      const { data, error: fetchErr } = await supabase.rpc('get_order_details', {
        order_id_param: orderId!,
        session_token_param: sessionToken,
      });

      if (fetchErr || !data || data.length === 0) {
        setError('Pedido não encontrado');
      } else {
        setOrder(data[0] as unknown as OrderData);
      }
      setLoading(false);
    }

    fetchOrder();

    // Realtime subscription for status updates
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => prev ? { ...prev, status: (payload.new as any).status } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, sessionToken]);

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === (order?.status || 'pending'));
  const isCancelled = order?.status === 'cancelled' || order?.status === 'cancelado';

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6 pt-8">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <XCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Pedido não encontrado</h1>
          <p className="text-muted-foreground">Verifique se o link está correto.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const orderItems = (Array.isArray(order.items) ? order.items : []) as OrderItem[];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">{order.store_name}</p>
          <p className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</p>
        </div>

        {/* Status Timeline */}
        {isCancelled ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive font-semibold">Pedido Cancelado</p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-card border border-border space-y-4">
            <h2 className="font-semibold text-foreground text-sm">Acompanhamento</h2>
            <div className="space-y-0">
              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isActive ? 'bg-primary/20' : 'bg-muted'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                        <Icon className={`w-4 h-4 ${isActive ? step.color : 'text-muted-foreground'}`} />
                      </div>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`w-0.5 h-8 ${isActive ? 'bg-primary/40' : 'bg-border'}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-primary animate-pulse mt-0.5">Status atual</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <h2 className="font-semibold text-foreground text-sm">Itens do Pedido</h2>
          <div className="space-y-2">
            {orderItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span className="text-foreground">{item.quantity}x {item.name}</span>
                  {item.modifiers?.map((m, mi) => (
                    <span key={mi} className="block text-xs text-muted-foreground ml-4">
                      + {m.name}
                    </span>
                  ))}
                  {item.observation && (
                    <span className="block text-xs text-muted-foreground ml-4 italic">
                      📝 {item.observation}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  R$ {((item.price + (item.modifiers?.reduce((s, m) => s + m.price, 0) || 0)) * item.quantity).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-border flex justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-primary text-lg">
              R$ {Number(order.total).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString('pt-BR')} • {order.payment_method || '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
