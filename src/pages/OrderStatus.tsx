import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle2, ChefHat, Truck, Clock, XCircle, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  { key: 'pending', label: 'Pedido recebido', icon: Clock },
  { key: 'preparing', label: 'Em preparação', icon: ChefHat },
  { key: 'out_for_delivery', label: 'Saiu para entrega', icon: Truck },
  { key: 'completed', label: 'Pedido concluído', icon: CheckCircle2 },
];

function normalizeStatus(status: string | null): string {
  const value = (status || 'pending').toLowerCase();
  if (['cancelled', 'canceled', 'cancelado'].includes(value)) return 'cancelled';
  if (['out_for_delivery', 'a_caminho', 'shipped'].includes(value)) return 'out_for_delivery';
  if (['completed', 'concluido', 'entregue'].includes(value)) return 'completed';
  if (['preparing', 'preparando'].includes(value)) return 'preparing';
  return 'pending';
}

export default function OrderStatus() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const whatsapp = (search.get('whatsapp') || '').replace(/\D/g, '');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || token.length < 32) {
      setError('Este link de acompanhamento está incompleto ou inválido. Solicite um novo link à loja.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let requestInFlight = false;

    const fetchOrder = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      setRefreshing(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_order_details', {
          order_id_param: id,
          session_token_param: token,
        });

        if (cancelled) return;
        if (rpcError || !data || data.length === 0) {
          setError('Não foi possível localizar o pedido com este link. Confira o endereço ou solicite ajuda à loja.');
          setOrder(null);
        } else {
          setOrder(data[0] as unknown as OrderInfo);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Falha de conexão ao consultar o pedido. Vamos tentar novamente automaticamente.');
      } finally {
        requestInFlight = false;
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void fetchOrder();
    const interval = window.setInterval(() => { void fetchOrder(); }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
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
        <div className="text-center max-w-md space-y-3">
          <h1 className="font-display text-3xl text-foreground mb-2">Acompanhamento indisponível</h1>
          <p className="text-muted-foreground">{error || 'Verifique o link ou peça ajuda ao estabelecimento.'}</p>
          {whatsapp && (
            <Button asChild className="mt-2">
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" /> Falar com a loja
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const status = normalizeStatus(order.status);
  const currentIdx = STEPS.findIndex((step) => step.key === status);
  const whatsappMessage = encodeURIComponent(`Olá! Gostaria de uma informação sobre o pedido #${order.id.slice(0, 8).toUpperCase()}.`);
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp}?text=${whatsappMessage}` : null;

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
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 pt-1">
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Atualização automática a cada 5 segundos
          </p>
        </header>

        {status === 'cancelled' ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-2">
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Pedido cancelado</h2>
            <p className="text-sm text-muted-foreground">Este pedido foi cancelado pelo estabelecimento. Entre em contato com a loja se precisar de esclarecimentos.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${done ? 'bg-primary/15 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                    {active && status !== 'completed' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total do pedido</p>
          <p className="text-2xl font-bold text-foreground">R$ {Number(order.total).toFixed(2).replace('.', ',')}</p>
          {order.payment_method && (
            <p className="text-xs text-muted-foreground mt-1">Pagamento: {order.payment_method}</p>
          )}
        </div>

        {whatsappHref && (
          <Button asChild className="w-full">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2" /> Falar com a loja pelo WhatsApp
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
