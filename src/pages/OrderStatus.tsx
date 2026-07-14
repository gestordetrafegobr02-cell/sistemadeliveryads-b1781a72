import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle2, ChefHat, Truck, Clock } from 'lucide-react';

interface OrderInfo {
  id: string;
  status: string | null;
  total: number;
  items: unknown;
  payment_method: string | null;
  created_at: string;
  store_name: string;
}

const STEPS = [
  { key: 'pending', label: 'Recebido', icon: Clock },
  { key: 'preparing', label: 'Preparando', icon: ChefHat },
  { key: 'out_for_delivery', label: 'Saiu para entrega', icon: Truck },
  { key: 'completed', label: 'Concluído', icon: CheckCircle2 },
];

export default function OrderStatus() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchOrder = async () => {
      // Prefer secure RPC with session token if present
      if (token) {
        const { data, error: e } = await supabase.rpc('get_order_details', {
          order_id_param: id,
          session_token_param: token,
        });
        if (!cancelled) {
          if (e || !data || data.length === 0) {
            // fallback to public by id
            const { data: d2 } = await supabase.rpc('get_order_by_id', { p_order_id: id });
            if (d2 && d2.length > 0) {
              setOrder(d2[0] as unknown as OrderInfo);
              setError(null);
            } else {
              setError('Pedido não encontrado.');
            }
          } else {
            setOrder(data[0] as unknown as OrderInfo);
            setError(null);
          }
          setLoading(false);
        }
        return;
      }

      const { data, error: e } = await supabase.rpc('get_order_by_id', { p_order_id: id });
      if (!cancelled) {
        if (e || !data || data.length === 0) setError('Pedido não encontrado.');
        else setOrder(data[0] as unknown as OrderInfo);
        setLoading(false);
      }
    };

    fetchOrder();
    // Poll every 5s for status updates (orders table blocks anon realtime SELECT)
    const interval = setInterval(fetchOrder, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-3xl text-foreground mb-2">Pedido não encontrado</h1>
          <p className="text-muted-foreground">{error || 'Verifique o link ou peça ao estabelecimento.'}</p>
        </div>
      </div>
    );
  }

  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.key === (order.status || 'pending')));

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <Helmet>
        <title>Acompanhe seu pedido — {order.store_name}</title>
      </Helmet>
      <div className="max-w-md mx-auto space-y-6">
        <header className="text-center space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Acompanhamento</p>
          <h1 className="font-display text-2xl text-foreground">{order.store_name}</h1>
          <p className="text-sm text-muted-foreground">Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
          <div className="flex justify-center pt-2">
            <OrderStatusBadge status={order.status} />
          </div>
        </header>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = idx <= currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${done ? 'bg-primary/15 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                  {active && order.status !== 'completed' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total</p>
          <p className="text-2xl font-bold text-foreground">R$ {Number(order.total).toFixed(2).replace('.', ',')}</p>
          {order.payment_method && (
            <p className="text-xs text-muted-foreground mt-1">Pagamento: {order.payment_method}</p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">Esta página atualiza automaticamente.</p>
      </div>
    </div>
  );
}
